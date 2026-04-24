/*
 * Assessment Results Page - AiQ Enterprise Platform
 *
 * UX improvements applied:
 * UX-1: Deep Dive tab no longer duplicates Summary content - shows only longitudinal chart,
 *        LLM narrative, and expanded signal breakdown with per-capability grouping.
 * UX-2: Development tab leads with LLM narrative (strengths/gaps/priorities) instead of
 *        generic static boilerplate.
 * UX-3: Score Summary card shows actual question count with early-completion label instead
 *        of hard-coded "/50".
 * UX-10: LongitudinalChart dots are coloured by readiness state; role-threshold reference
 *         line added at y=75 (safe threshold).
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
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
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart2,
  Users,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExplanationDrawer, ScoreBreakdown } from "@/components/ExplanationDrawer";
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
  Dot,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";

// ─── Readiness / Credibility / Risk config ────────────────────────────────────

const READINESS_CONFIG = {
  safe: {
    label: "AI-Ready",
    // S6: softened - no "governance" or "deploy" language
    description: "Demonstrates consistent, appropriate application of AI tools with strong awareness of risks and limitations.",
    color: "text-[#228833]",
    bg: "border-[#228833]/30 bg-[#228833]/5",
    barColor: "#228833",
    icon: CheckCircle2,
    dotColor: "#228833",
  },
  at_risk: {
    label: "Developing",
    // S6: softened - no "mandatory remediation" or "restricted use"
    description: "Emerging AI capability identified with areas for further development. Supervised practice and structured learning is recommended.",
    color: "text-[#EE8866]",
    bg: "border-[#EE8866]/30 bg-[#EE8866]/5",
    barColor: "#EE8866",
    icon: AlertTriangle,
    dotColor: "#EE8866",
  },
  unsafe: {
    label: "Not Yet Ready",
    // S6: softened - no "governance hold" or "unsafe to deploy"
    description: "Significant AI capability gaps identified. Structured development and supervised AI use is recommended before independent deployment.",
    color: "text-[#EE6677]",
    bg: "border-[#EE6677]/30 bg-[#EE6677]/5",
    barColor: "#EE6677",
    icon: ShieldAlert,
    dotColor: "#EE6677",
  },
  unknown: {
    label: "Insufficient Data",
    description: "Not enough evidence to classify readiness. Complete more assessment interactions.",
    color: "text-muted-foreground",
    bg: "border-border",
    barColor: "#888888",
    icon: HelpCircle,
    dotColor: "#888888",
  },
  // v10: foundation gap state
  foundation_gap: {
    label: "Foundation Gap",
    description: "Core AI interaction and output evaluation skills need development before strategic AI capabilities can be reliably assessed.",
    color: "text-[#AA3377]",
    bg: "border-[#AA3377]/30 bg-[#AA3377]/5",
    barColor: "#AA3377",
    icon: ShieldAlert,
    dotColor: "#AA3377",
  },
  // S2: new state for low-confidence results
  unknown_insufficient_evidence: {
    label: "Result Unavailable",
    description: "The assessment could not produce a reliable classification due to low confidence. This may be due to inconsistent responses or limited interaction variety.",
    color: "text-muted-foreground",
    bg: "border-border",
    barColor: "#888888",
    icon: HelpCircle,
    dotColor: "#888888",
  },
} as const;

const CREDIBILITY_CONFIG = {
  high: { label: "High Credibility", color: "text-[#228833]", bg: "bg-[#228833]/10" },
  medium: { label: "Medium Credibility", color: "text-[#EE8866]", bg: "bg-[#EE8866]/10" },
  low: { label: "Low Credibility", color: "text-[#EE6677]", bg: "bg-[#EE6677]/10" },
} as const;

const RISK_CONFIG = {
  low: { label: "Low Risk", color: "text-[#228833]", bg: "bg-[#228833]/10" },
  medium: { label: "Medium Risk", color: "text-[#EE8866]", bg: "bg-[#EE8866]/10" },
  high: { label: "High Risk", color: "text-[#EE6677]", bg: "bg-[#EE6677]/10" },
} as const;

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
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Longitudinal Tracking Chart (UX-10: readiness dots + threshold line) ────

interface LongitudinalEntry {
  sessionId: string;
  completedAt: number | null;
  overallScore: number;
  capabilityScores: Record<string, number>;
  readinessState: string;
}

// Custom dot coloured by readiness state
function ReadinessDot(props: any) {
  const { cx, cy, payload } = props;
  const state = (payload?.readinessState ?? "unknown") as keyof typeof READINESS_CONFIG;
  const color = READINESS_CONFIG[state]?.dotColor ?? "#888888";
  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="hsl(var(--background))" strokeWidth={2} />;
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
      : `Session ${i + 1}`,
    score: s.overallScore,
    readinessState: s.readinessState,
  }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#10B981]" />
          Progress Over Time
        </CardTitle>
        <div className="flex items-center gap-4 flex-wrap mt-1">
          {(["safe", "at_risk", "unsafe"] as const).map(state => (
            <div key={state} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: READINESS_CONFIG[state].dotColor }} />
              <span className="text-xs text-muted-foreground">{READINESS_CONFIG[state].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-[#228833]/60" />
            <span className="text-xs text-muted-foreground">Safe threshold (75)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value}`, "Overall Score"]}
              />
              {/* UX-10: Safe threshold reference line */}
              <ReferenceLine
                y={75}
                stroke="#228833"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{ value: "Safe", position: "right", fontSize: 10, fill: "#228833" }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#10B981"
                strokeWidth={2}
                dot={<ReadinessDot />}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 100 }: { score: number; color: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
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

// ─── Percentile Band Badge with Tooltip ─────────────────────────────────────

const PERCENTILE_BAND_INFO: Record<string, { description: string; colour: string }> = {
  "Top 20%":        { colour: "#228833", description: "Your score places you in the top fifth of your peer group - a strong result relative to HR professionals at a similar level and role." },
  "Above average":  { colour: "#44bb99", description: "Your score is above the midpoint for your peer group. You are performing better than most HR professionals at a similar level and role." },
  "Around average": { colour: "#EE8866", description: "Your score is close to the typical result for your peer group. This is a normal starting point - most capability development happens from here." },
  "Below average":  { colour: "#EE6677", description: "Your score is below the midpoint for your peer group. This signals a development opportunity relative to HR professionals at a similar level and role." },
  "Bottom 20%":     { colour: "#CC3311", description: "Your score is in the bottom fifth of your peer group. Focused development in this capability is recommended before taking on AI-assisted decisions in this area." },
};

function PercentileBandBadge({
  label,
  normGroupLabel,
}: {
  label: string;
  normGroupLabel?: string;
}) {
  const info = PERCENTILE_BAND_INFO[label];
  const colour = info?.colour ?? "#888888";
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-1 cursor-help rounded-full px-2 py-0.5 text-xs font-medium border select-none"
          style={{
            color: colour,
            borderColor: `${colour}55`,
            backgroundColor: `${colour}18`,
          }}
        >
          {label}
          <Info className="size-3 opacity-60" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs text-xs leading-relaxed"
        sideOffset={6}
      >
        <p className="font-semibold mb-1">{label}</p>
        {info && <p>{info.description}</p>}
        {normGroupLabel && (
          <p className="mt-1.5 opacity-70 italic">Compared to: {normGroupLabel}</p>
        )}
        <p className="mt-1.5 opacity-60 italic">Provisional - based on synthetic baseline distributions.</p>
      </TooltipContent>
    </UITooltip>
  );
}

// ─── Capability Bar ───────────────────────────────────────────────────────────

/**
 * CR-2: Compute confidence interval half-width based on signal count.
 * Fewer signals → wider interval. Uses a heuristic based on the
 * standard error of a proportion, scaled to the 0–100 score range.
 * At 3 signals: ±18 points. At 8 signals: ±11 points. At 15+: ±8 points.
 */
function computeConfidenceHalfWidth(signalCount: number): number {
  if (signalCount <= 0) return 25; // no evidence — maximum uncertainty
  // Heuristic: base SE ≈ 50/sqrt(n), capped at [6, 25]
  const raw = 50 / Math.sqrt(signalCount);
  return Math.round(Math.max(6, Math.min(25, raw)));
}

function CapabilityBar({
  displayName,
  score,
  colour,
  signalCount,
  percentileBandLabel,
  normGroupLabel,
}: {
  displayName: string;
  score: number;
  colour: string;
  signalCount?: number;
  /** S5: Use band label instead of precise percentile */
  percentileBandLabel?: string;
  normGroupLabel?: string;
}) {
  const band = score >= 75 ? "Strong" : score >= 55 ? "Developing" : score >= 35 ? "Needs Work" : "Critical";
  const bandColor = score >= 75 ? "#228833" : score >= 55 ? "#EE8866" : "#EE6677";
  const hw = computeConfidenceHalfWidth(signalCount ?? 0);
  const lo = Math.max(0, score - hw);
  const hi = Math.min(100, score + hw);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{displayName}</span>
        <div className="flex items-center gap-2">
          {percentileBandLabel && (
            <PercentileBandBadge
              label={percentileBandLabel}
              normGroupLabel={normGroupLabel}
            />
          )}
          <span className="text-xs font-medium" style={{ color: bandColor }}>{band}</span>
          <span className="text-sm font-bold w-8 text-right" style={{ color: colour }}>{score}</span>
        </div>
      </div>
      {/* Score bar with confidence interval overlay */}
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        {/* Confidence interval range — translucent band */}
        <div
          className="absolute top-0 h-full rounded-full opacity-20 transition-all duration-700"
          style={{
            left: `${lo}%`,
            width: `${hi - lo}%`,
            backgroundColor: colour,
          }}
        />
        {/* Point estimate bar */}
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: colour }}
        />
      </div>
      {/* Confidence interval label */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Range: {lo}–{hi} ({signalCount ?? 0} signal{(signalCount ?? 0) !== 1 ? "s" : ""})
        </span>
        {hw >= 15 && (
          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" />
            Low evidence
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Signal Row ───────────────────────────────────────────────────────────────

// v10 signal glossary — 26 signals across 6 domains
const SIGNAL_GLOSSARY: Record<string, string> = {
  // AI Interaction (foundation)
  prompt_quality:              "How effectively you construct prompts that produce useful, accurate AI outputs.",
  iteration_quality:           "How well you refine and improve prompts when initial results are unsatisfactory.",
  context_framing:             "How clearly you provide context, constraints, and format requirements to AI tools.",
  tool_selection:              "How appropriately you choose the right AI tool or approach for each task.",
  // AI Output Evaluation (foundation)
  error_detection_quality:     "How accurately you spot factual errors, hallucinations, or logical flaws in AI outputs.",
  fitness_for_purpose:           "How well you assess whether AI output is fit for its intended purpose and audience.",
  confidence_calibration:      "How accurately your self-assessed confidence aligns with the quality of your answers.",
  source_verification:         "How thoroughly you verify AI claims against authoritative sources.",
  // AI Workflow Design (strategic)
  process_analysis:            "How well you identify where AI adds value in existing workflows.",
  handoff_design:              "How appropriately you design human-AI handoff points with clear accountability.",
  efficiency_gain:             "How effectively your AI workflow designs improve efficiency without introducing risk.",
  oversight_integration:       "How well you build quality checks and human oversight into AI-augmented processes.",
  // Workforce AI Readiness (strategic)
  gap_diagnosis:               "How accurately you diagnose AI capability gaps in teams and organisations.",
  intervention_quality:        "How well you design targeted interventions to address identified capability gaps.",
  advisory_quality:            "How effectively you advise leaders on AI readiness and capability development.",
  measurement_rigour:          "How rigorously you measure and track AI capability development progress.",
  // AI Ethics & Employee Trust (strategic)
  ethical_reasoning:           "How well you identify and navigate ethical dilemmas involving AI in the workplace.",
  pressure_resistance:         "How firmly you maintain ethical positions when pressure escalates.",
  stakeholder_awareness:       "How well you consider the impact of AI decisions on different stakeholder groups.",
  trust_preservation:          "How effectively you maintain employee trust during AI-driven changes.",
  transparency_quality:        "How well you communicate AI decisions and their rationale to affected parties.",
  // AI Change Leadership (strategic)
  resistance_handling:         "How constructively you address resistance to AI adoption.",
  pace_calibration:            "How well you calibrate the pace of AI change to organisational readiness.",
  legitimate_concern_recognition: "How accurately you distinguish legitimate AI concerns from unfounded resistance.",
  change_sustainability:       "How well you design AI changes that are sustainable and self-reinforcing.",
  vision_articulation:         "How clearly you articulate the case for AI transformation to diverse audiences.",
};

function SignalRow({ signal, delta }: { signal: string; delta: number }) {
  const isPositive = delta > 0;
  const isRisk = signal.includes("_risk") || signal.includes("_index");
  const displayName = signal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const glossaryEntry = SIGNAL_GLOSSARY[signal];
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-[#228833] shrink-0" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-[#EE6677] shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-foreground">{displayName}</span>
            {isRisk && (
              <span className="text-xs text-[#EE8866] bg-[#EE8866]/10 px-1.5 py-0.5 rounded text-[10px]">risk signal</span>
            )}
          </div>
          {glossaryEntry && (
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{glossaryEntry}</p>
          )}
        </div>
      </div>
      <span className={cn("text-xs font-bold tabular-nums ml-3 shrink-0", isPositive ? "text-[#228833]" : "text-[#EE6677]")}>
        {isPositive ? "+" : ""}{delta.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Capability Development Actions ─────────────────────────────────────────

// v10 capability development actions — imported from shared constants
import { DOMAIN_COLOURS, DOMAIN_LABELS, DOMAIN_DESCRIPTIONS, DOMAIN_RECOMMENDATIONS, DOMAIN_SHORT_LABELS, READINESS_STATES, FOUNDATION_DOMAINS, STRATEGIC_DOMAINS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";

const CAPABILITY_DEVELOPMENT_ACTIONS: Record<string, string> = DOMAIN_RECOMMENDATIONS;

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AssessmentResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [showExplanation, setShowExplanation] = useState(false);
  const [flagged, setFlagged] = useState(false);
  // P2-AE-3: Staged reveal — sections animate in sequentially after data loads
  const [revealStage, setRevealStage] = useState(0); // 0=hidden, 1=readiness, 2=domains, 3=signals, 4=full
  const [hasRevealed, setHasRevealed] = useState(false);

  const { data, isLoading, error } = trpc.assessment.results.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchOnWindowFocus: false }
  );

  // WS1.4: Classification explanation (lazy - only fetched when panel is opened)
  const { data: explanationData, isLoading: explanationLoading } =
    trpc.assessment.getClassificationExplanation.useQuery(
      { sessionId: sessionId! },
      { enabled: !!sessionId && showExplanation, refetchOnWindowFocus: false }
    );

  // Benchmark comparison data
  const { data: benchmarkData, isLoading: benchmarkLoading } =
    trpc.assessment.getBenchmarks.useQuery(
      { sessionId: sessionId! },
      { enabled: !!sessionId, refetchOnWindowFocus: false }
    );

  // WS4.3: Flag for review
  const flagMutation = trpc.assessment.flagForReview.useMutation({
    onSuccess: (res: any) => {
      setFlagged(true);
      if (res.alreadyFlagged) {
        toast.warning("Already flagged - this session has already been submitted for review.");
      } else {
        toast.success("Session flagged for review - a member of the assessment team will review your results.");
      }
    },
    onError: () => {
      toast.error("Could not submit flag - please try again later.");
    },
  });

  // P2-AE-3: Trigger staged reveal when data loads (only once per page visit)
  useEffect(() => {
    if (data?.score && !hasRevealed) {
      setHasRevealed(true);
      const delays = [200, 800, 1400, 2000];
      delays.forEach((delay, i) => {
        setTimeout(() => setRevealStage(i + 1), delay);
      });
    }
  }, [data?.score, hasRevealed]);

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
  const totalAnswers = breakdown.totalAnswers ?? 0;
  const targetItems = breakdown.targetItems ?? 49;
  const isEarlyCompletion = totalAnswers < targetItems;
  // P1/P2: Percentile ranks and norm group (S5: use band labels)
  const percentileRanks = (breakdown.percentileRanks ?? {}) as Record<string, { percentile: number; percentileBand: string; percentileBandLabel: string; label: string; normGroupLabel: string; isSynthetic: boolean }>;
  const normGroupVersion = (breakdown.normGroupVersion ?? null) as string | null;
  // P3: Classification confidence gate caveat
  const classificationConfidence = (breakdown.classificationConfidence ?? null) as { band: string; label: string; wasDowngraded: boolean; caveat: string | null } | null;

  // A4: Governance action and governing constraint
  const governanceAction = (breakdown.governanceAction ?? null) as string | null;
  const governingConstraint = (breakdown.governingConstraint ?? null) as {
    capability: string; score: number; band: string; thresholdRequired: number; gap: number; droveClassification: boolean;
  } | null;
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
      signalCount: typeof val === "object" ? (val.signalCount ?? 0) : 0,
    }))
    .sort((a, b) => b.score - a.score);

  // Sort signals by absolute delta descending, show top 12
  const sortedSignals = Object.entries(signalScores as Record<string, number>)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 12);

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
          AiQ V10 Adaptive Assessment · Completed {completedAt}
        </p>
      </div>

      {/* ── Three-Layer Tabs ── */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
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
          <TabsTrigger value="benchmarks" className="gap-1.5 text-xs">
            <BarChart2 className="w-3.5 h-3.5" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="calibration" className="gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" />
            Calibration
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: SUMMARY
            Contains: readiness banner, narrative, capability breakdown (radar +
            bars), signal profile, contradiction profile, ethics profile,
            score summary, actions, disclaimer.
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="summary" className="space-y-6">

          {/* Readiness State Banner */}
          <div
            className="transition-all duration-700 ease-out"
            style={{ opacity: revealStage >= 1 ? 1 : 0, transform: revealStage >= 1 ? "translateY(0)" : "translateY(16px)" }}
          >
          <Card className={cn("border-2", stateConfig.bg)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="shrink-0">
                  <ScoreRing score={overallScore} color={stateConfig.barColor} size={120} />
                </div>
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
                      Model: V9.2 · {totalAnswers} questions
                    </span>
                    {/* S3.3: Governing constraint in header when classification is not safe */}
                    {governingConstraint && (governingConstraint as any).droveClassification && primaryState !== "safe" && (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Flag className="w-3 h-3 flex-shrink-0" />
                        Governing constraint: <span className="capitalize">{String((governingConstraint as any).capability).replace(/_/g, " ")}</span>
                        &nbsp;(gap {Math.round(Number((governingConstraint as any).gap))} pts)
                      </span>
                    )}
                    {/* P15: ExplanationDrawer - score transparency */}
                    <ExplanationDrawer
                      trigger={
                        <button className="text-xs text-[#10B981] underline underline-offset-2 flex items-center gap-1 hover:opacity-80 transition-opacity">
                          <Info className="w-3 h-3" />
                          How is this calculated?
                        </button>
                      }
                      title="How your AiQ score is calculated"
                      subtitle="A transparent breakdown of the six capability domains that make up your readiness profile"
                    >
                      <ScoreBreakdown
                        overallScore={overallScore}
                        confidenceLevel={
                          (classificationConfidence?.band === "high" ? "high"
                          : classificationConfidence?.band === "medium" ? "medium"
                          : "low") as "high" | "medium" | "low"
                        }
                        dataPoints={totalAnswers}
                        lastUpdated={data.session.completedAt
                          ? new Date(data.session.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "today"}
                        factors={sortedCapabilities.map(cap => ({
                          name: cap.displayName,
                          score: Math.round(cap.score),
                          weight: Math.round(100 / Math.max(sortedCapabilities.length, 1)),
                          description: SIGNAL_GLOSSARY[cap.key] ?? cap.displayName,
                          color: cap.colour,
                        }))}
                      />
                    </ExplanationDrawer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>{/* end reveal stage 1 */}

          {/* P3: Classification confidence gate caveat */}
          {classificationConfidence?.caveat && (
            <Card className="border-[#EE8866]/40 bg-[#EE8866]/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#EE8866] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#EE8866] uppercase tracking-wider mb-1">
                      Confidence Notice
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{classificationConfidence.caveat}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Narrative */}
          {narrative && (
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wider mb-1.5">
                      Your Results Narrative
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{narrative}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capability Breakdown — reveal stage 2 */}
          <div
            className="transition-all duration-700 ease-out"
            style={{ opacity: revealStage >= 2 ? 1 : 0, transform: revealStage >= 2 ? "translateY(0)" : "translateY(16px)" }}
          >
          {sortedCapabilities.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Capability Breakdown
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Scores are derived from signal-weighted deltas across all answered interactions.
                  Each capability domain maps to multiple performance and risk signals.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedCapabilities.length >= 3 && (
                  <RadarCapabilityChart capabilities={sortedCapabilities} />
                )}
                {sortedCapabilities.map(cap => (
                  <CapabilityBar
                    key={cap.key}
                    displayName={cap.displayName}
                    score={cap.score}
                    colour={cap.colour}
                    signalCount={cap.signalCount}
                    percentileBandLabel={percentileRanks[cap.key]?.percentileBandLabel}
                    normGroupLabel={percentileRanks[cap.key]?.normGroupLabel}
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
                {/* S5: Provisional percentile band disclosure */}
                {normGroupVersion && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2 mt-1">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Info className="w-3 h-3 shrink-0" />
                      <span>
                        <strong>Provisional benchmark:</strong> Relative standing is shown as broad quartile bands rather than precise percentiles. These benchmarks are based on synthetic baseline distributions ({normGroupVersion}) and will be recalibrated once sufficient real-world assessment data is available.
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          </div>{/* end reveal stage 2 */}

          {/* Signal Profile — reveal stage 3 */}
          <div
            className="transition-all duration-700 ease-out"
            style={{ opacity: revealStage >= 3 ? 1 : 0, transform: revealStage >= 3 ? "translateY(0)" : "translateY(16px)" }}
          >
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

          {/* Contradiction Profile */}
          {breakdown.contradictionProfile && (breakdown.contradictionProfile as any).detected > 0 && (
            <Card className="border-[#EE6677]/30 bg-[#EE6677]/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#EE6677] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground font-sora mb-1">Contradiction Profile</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {(breakdown.contradictionProfile as any).detected} inconsistenc{(breakdown.contradictionProfile as any).detected === 1 ? 'y' : 'ies'} detected across your responses.
                      Contradictions reduce credibility and may indicate uncertainty or inconsistent reasoning across domains.
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

          {/* Ethics & Trust Profile (v10) */}
          {breakdown.governanceProfile && (
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground font-sora mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#AA3377]" />
                  Ethics & Trust Profile
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Ethics Score</p>
                    <p className="text-xl font-bold font-sora text-foreground">
                      {Math.round((breakdown.governanceProfile as any).score ?? 0)}
                      <span className="text-sm font-normal text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Ethics Band</p>
                    <p className="text-sm font-bold font-sora text-foreground capitalize">
                      {(breakdown.governanceProfile as any).band ?? "Not assessed"}
                    </p>
                  </div>
                </div>
                {(breakdown.governanceProfile as any).bypasses > 0 && (
                  <p className="text-xs text-[#EE6677] mt-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {(breakdown.governanceProfile as any).bypasses} ethical concern{(breakdown.governanceProfile as any).bypasses === 1 ? '' : 's'} flagged.
                    These are highlighted for review by your ethics and trust team.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* A4: Development Action Banner (v10) */}
          {governanceAction && (
            <Card className={`border-l-4 ${governanceAction === "development_required" ? "border-l-[#EF4444] bg-[#EF4444]/5" : "border-l-[#F59E0B] bg-[#F59E0B]/5"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className={`w-5 h-5 mt-0.5 flex-shrink-0 ${governanceAction === "development_required" ? "text-[#EF4444]" : "text-[#F59E0B]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground font-sora mb-1">
                      {governanceAction === "development_required" ? "Development Required Before Independent AI Use" : "Supported AI Use Recommended"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {governanceAction === "development_required"
                        ? "Your current capability profile indicates significant gaps that should be addressed through structured development before independent AI use."
                        : "Your capability profile supports AI use with appropriate oversight. A manager or senior colleague should review AI outputs in high-stakes decisions."}
                    </p>
                    {governingConstraint && governingConstraint.droveClassification && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                        <Flag className="w-3 h-3 flex-shrink-0" />
                        Governing constraint: <span className="font-medium text-foreground capitalize">{governingConstraint.capability.replace(/_/g, " ")}</span>
                        {" "}(score {Math.round(governingConstraint.score)}, threshold {Math.round(governingConstraint.thresholdRequired)}, gap {Math.round(governingConstraint.gap)} points)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* UX-3: Score Summary - actual question count with early-completion label */}
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Questions Answered</p>
                  <p className="text-2xl font-bold text-foreground font-sora">
                    {totalAnswers}
                  </p>
                  {isEarlyCompletion && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Zap className="w-3 h-3 text-[#228833]" />
                      <span className="text-[10px] text-[#228833] font-semibold">Early completion</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
                  <p className="text-2xl font-bold font-sora" style={{ color: stateConfig.barColor }}>
                    {overallScore}
                  </p>
                  {/* CR-2: Overall confidence interval */}
                  {(() => {
                    const totalSignals = sortedCapabilities.reduce((sum, c) => sum + c.signalCount, 0);
                    const oHw = computeConfidenceHalfWidth(totalSignals);
                    const oLo = Math.max(0, overallScore - oHw);
                    const oHi = Math.min(100, overallScore + oHw);
                    return (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Range: {oLo}\u2013{oHi}
                      </p>
                    );
                  })()}
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
          {/* CR-3: Methodology transparency badge */}
          <a
            href="/methodology"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#0F6E56]/20 bg-[#0F6E56]/5 hover:bg-[#0F6E56]/10 transition-colors cursor-pointer no-underline"
          >
            <Shield className="w-3.5 h-3.5 text-[#0F6E56]" />
            <span className="text-xs text-[#0F6E56] font-medium">SJT-based adaptive assessment</span>
            <span className="text-[10px] text-muted-foreground ml-auto">View methodology</span>
          </a>

          {/* WS4.2: Why this classification? expandable panel */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <button
                onClick={() => setShowExplanation(v => !v)}
                className="flex items-center justify-between w-full text-left"
              >
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  Why this classification?
                </CardTitle>
                {showExplanation
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
            </CardHeader>
            {showExplanation && (
              <CardContent className="pt-0 space-y-3">
                {explanationLoading && <Skeleton className="h-24 w-full" />}
                {explanationData && (
                  <>
                    {(explanationData as any).isProvisional && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2">
                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <Info className="w-3 h-3 shrink-0" />
                          This classification is provisional due to limited evidence or low assessment confidence.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {((explanationData as any).factors ?? []).map((f: any, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm">
                          {f.direction === "positive" ? (
                            <ThumbsUp className="w-4 h-4 text-[#228833] shrink-0 mt-0.5" />
                          ) : f.direction === "negative" ? (
                            <ThumbsDown className="w-4 h-4 text-[#EE6677] shrink-0 mt-0.5" />
                          ) : (
                            <Minus className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-medium text-foreground">{f.factor}: </span>
                            <span className="text-muted-foreground">{f.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {((explanationData as any).topStrengths ?? []).length > 0 && (
                      <div className="rounded-md bg-[#228833]/5 border border-[#228833]/20 px-3 py-2">
                        <p className="text-xs font-semibold text-[#228833] mb-1">Top strengths</p>
                        <p className="text-xs text-muted-foreground">{(explanationData as any).topStrengths.join(" · ")}</p>
                      </div>
                    )}
                    {((explanationData as any).topGaps ?? []).length > 0 && (
                      <div className="rounded-md bg-[#EE6677]/5 border border-[#EE6677]/20 px-3 py-2">
                        <p className="text-xs font-semibold text-[#EE6677] mb-1">Development priorities</p>
                        <p className="text-xs text-muted-foreground">{(explanationData as any).topGaps.join(" · ")}</p>
                      </div>
                    )}
                    {((explanationData as any).itemCitations ?? []).length > 0 && (
                      <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                        <p className="text-xs font-semibold text-foreground mb-2">Evidence trail — key items that influenced this classification</p>
                        <div className="space-y-1.5">
                          {((explanationData as any).itemCitations as Array<{itemId: string; questionSummary: string; signalKey: string; delta: number; capabilityKey: string | null; outcomeClass: string | null}>)
                            .slice(0, 5)
                            .map((c, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className={`shrink-0 mt-0.5 font-mono text-[10px] px-1 rounded ${
                                  c.outcomeClass === "strong" ? "bg-[#228833]/10 text-[#228833]" :
                                  c.outcomeClass === "failure" || c.outcomeClass === "critical_failure" ? "bg-[#EE6677]/10 text-[#EE6677]" :
                                  "bg-muted text-muted-foreground"
                                }`}>{c.outcomeClass ?? "?"}</span>
                                <div className="min-w-0">
                                  <p className="text-muted-foreground truncate">{c.questionSummary}</p>
                                  <p className="text-[10px] text-muted-foreground/70">{c.signalKey.replace(/_/g, " ")} · Δ{c.delta > 0 ? "+" : ""}{c.delta.toFixed(2)}{c.capabilityKey ? ` · ${c.capabilityKey.replace(/_/g, " ")}` : ""}</p>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Scoring model: {(explanationData as any).scoringConfigVersion} · Confidence: {(explanationData as any).confidenceBand}
                    </p>
                  </>
                )}
              </CardContent>
            )}
          </Card>

          {/* WS4.3: Flag for review */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
              disabled={flagged || flagMutation.isPending}
              onClick={() => {
                if (sessionId) flagMutation.mutate({ sessionId, reason: "Participant-initiated review request" });
              }}
            >
              <Flag className="w-3.5 h-3.5" />
              {flagged ? "Flagged for review" : "Flag this result for review"}
            </Button>
          </div>

          </div>{/* end reveal stage 3 */}

          {/* Actions — reveal stage 4 */}
          <div
            className="transition-all duration-700 ease-out"
            style={{ opacity: revealStage >= 4 ? 1 : 0, transform: revealStage >= 4 ? "translateY(0)" : "translateY(16px)" }}
          >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={() => navigate("/learning")}
              className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
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

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center pb-4">
            Results are generated by the AIQ V9.2 signal-delta scoring model. Scores reflect demonstrated
            decision-making patterns in the assessed interactions and are not a measure of general intelligence
            or professional competence. This report is for development purposes only.
          </p>
          </div>{/* end reveal stage 4 */}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: DEEP DIVE
            UX-1: Contains ONLY content exclusive to this tab - no duplication
            of capability bars / signal profile / ethics profile from Summary.
            Shows: longitudinal tracking, LLM narrative, expanded signal breakdown
            grouped by positive vs risk signals.
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="deepdive" className="space-y-6">

          {/* UX-10: Longitudinal Tracking with readiness dots + threshold line */}
          <LongitudinalChart data={longitudinalData} />

          {/* LLM Development Narrative (also shown in Development tab) */}
          {llmNarrative && (
            <Card className="border-[#10B981]/30 bg-[#10B981]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#10B981]" />
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
                  <h4 className="text-xs font-semibold text-[#10B981] uppercase tracking-wide">Priorities</h4>
                  <p className="text-sm text-foreground leading-relaxed">{llmNarrative.priorities}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expanded Signal Breakdown - grouped by positive vs risk */}
          {sortedSignals.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Full Signal Breakdown
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  All {sortedSignals.length} signals detected, sorted by magnitude. Positive signals indicate
                  demonstrated capability; negative signals indicate risk patterns or gaps.
                </p>
              </CardHeader>
              <CardContent>
                {/* Positive signals */}
                {sortedSignals.filter(([, v]) => (v as number) > 0).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[#228833] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Positive Signals ({sortedSignals.filter(([, v]) => (v as number) > 0).length})
                    </p>
                    <div className="divide-y divide-border/40">
                      {sortedSignals
                        .filter(([, v]) => (v as number) > 0)
                        .map(([signal, delta]) => (
                          <SignalRow key={signal} signal={signal} delta={delta as number} />
                        ))}
                    </div>
                  </div>
                )}
                {/* Risk signals */}
                {sortedSignals.filter(([, v]) => (v as number) <= 0).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#EE6677] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Risk Signals ({sortedSignals.filter(([, v]) => (v as number) <= 0).length})
                    </p>
                    <div className="divide-y divide-border/40">
                      {sortedSignals
                        .filter(([, v]) => (v as number) <= 0)
                        .map(([signal, delta]) => (
                          <SignalRow key={signal} signal={signal} delta={delta as number} />
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Technical metadata - only in deep dive */}
          <Card className="border-border">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground font-sora mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Assessment Metadata
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Model Version</p>
                  <p className="font-semibold text-foreground">{breakdown.modelVersion ?? "V9.2"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Questions Answered</p>
                  <p className="font-semibold text-foreground">
                    {totalAnswers}{isEarlyCompletion ? " (early completion)" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Credibility Band</p>
                  <p className="font-semibold text-foreground capitalize">{credibilityBand}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Risk Band</p>
                  <p className="font-semibold text-foreground capitalize">{riskBand}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: DEVELOPMENT
            UX-2: Leads with LLM narrative (strengths/gaps/priorities) instead
            of generic static boilerplate. Falls back to capability-based
            recommendations only when llmNarrative is unavailable.
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="development" className="space-y-6">

          {/* UX-2: LLM narrative as primary content */}
          {llmNarrative ? (
            <Card className="border-[#10B981]/30 bg-[#10B981]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#10B981]" />
                  Personalised Development Report
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Generated from your full capability profile and response patterns.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-xl bg-[#228833]/8 border border-[#228833]/20 space-y-1.5">
                  <h4 className="text-xs font-bold text-[#228833] uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Your Strengths
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">{llmNarrative.strengths}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#EE8866]/8 border border-[#EE8866]/20 space-y-1.5">
                  <h4 className="text-xs font-bold text-[#EE8866] uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Development Areas
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">{llmNarrative.gaps}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#10B981]/8 border border-[#10B981]/20 space-y-1.5">
                  <h4 className="text-xs font-bold text-[#10B981] uppercase tracking-wide flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Immediate Priorities
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">{llmNarrative.priorities}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Fallback: static narrative + lowest-3-capabilities card */
            <>
              {narrative && (
                <Card className="border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wider mb-1.5">Your Results Narrative</p>
                        <p className="text-sm text-foreground leading-relaxed">{narrative}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {sortedCapabilities.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-[#10B981]" />
                      Development Focus Areas
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Based on your lowest-scoring capability domains.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sortedCapabilities.slice(-3).map(cap => (
                      <div key={cap.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cap.colour }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">{cap.displayName}</p>
                            <span className="text-xs font-bold" style={{ color: cap.colour }}>{cap.score}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {CAPABILITY_DEVELOPMENT_ACTIONS[cap.key] ?? "Practice applying this capability in realistic HR scenarios. Review the relevant module in your learning plan."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => navigate("/learning")} className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2">
              <BookOpen className="w-4 h-4" />
              View Learning Plan
            </Button>
            <Button onClick={() => navigate("/assessment")} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Retake Assessment
            </Button>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: BENCHMARKS
            Contains: grouped bar chart (user vs role avg vs platform avg),
            comparison table, percentile context, synthetic data disclaimer.
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="benchmarks" className="space-y-6">
          {benchmarkLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : !benchmarkData ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">Benchmark data unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">Complete the assessment to see how you compare.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#4477AA]/10">
                  <BarChart2 className="w-5 h-5 text-[#4477AA]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Benchmark Comparison</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your scores compared against {benchmarkData.roleLabel} ({benchmarkData.seniorityLabel}-level)
                    and the platform-wide average across all HR professionals.
                  </p>
                </div>
              </div>

              {/* Grouped Bar Chart */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">Score Comparison by Capability</CardTitle>
                  <div className="flex items-center gap-5 flex-wrap mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
                      <span className="text-xs text-muted-foreground">Your Score</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[#4477AA]" />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> Role Average
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[#CCBB44]" />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Platform Average
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={benchmarkData.capabilities.map(c => ({
                          name: c.displayName.replace("AI ", ""),
                          "Your Score": c.userScore,
                          "Role Average": c.roleMean,
                          "Platform Average": c.platformMean,
                        }))}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                        barCategoryGap="25%"
                        barGap={2}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) => [`${value}`, name]}
                        />
                        <ReferenceLine y={75} stroke="#228833" strokeDasharray="4 4" strokeOpacity={0.5}
                          label={{ value: "Safe", position: "right", fontSize: 9, fill: "#228833" }}
                        />
                        <Bar dataKey="Your Score" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Role Average" fill="#4477AA" radius={[3, 3, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Platform Average" fill="#CCBB44" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Table */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">Detailed Comparison</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Capability</th>
                          <th className="text-center px-3 py-2.5 text-[#10B981] font-medium">Your Score</th>
                          <th className="text-center px-3 py-2.5 text-[#4477AA] font-medium">Role Avg</th>
                          <th className="text-center px-3 py-2.5 text-[#CCBB44] font-medium">Platform Avg</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">vs Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchmarkData.capabilities.map((cap, i) => {
                          const diff = cap.userScore - cap.roleMean;
                          const isAbove = diff > 0;
                          const isBelow = diff < -5;
                          return (
                            <tr key={cap.key} className={cn("border-b border-border/50", i % 2 === 0 ? "bg-muted/20" : "")}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cap.colour }} />
                                  <span className="font-medium text-foreground">{cap.displayName.replace("AI ", "")}</span>
                                </div>
                              </td>
                              <td className="text-center px-3 py-2.5 font-semibold text-foreground">{cap.userScore}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground">{cap.roleMean}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground">{cap.platformMean}</td>
                              <td className="text-center px-3 py-2.5">
                                <span className={cn(
                                  "inline-flex items-center gap-0.5 font-medium",
                                  isAbove ? "text-[#228833]" : isBelow ? "text-[#EE6677]" : "text-muted-foreground"
                                )}>
                                  {isAbove ? <TrendingUp className="w-3 h-3" /> : isBelow ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                  {isAbove ? `+${diff}` : diff}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Percentile Context Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {benchmarkData.capabilities.map(cap => {
                  const diff = cap.userScore - cap.roleMean;
                  const sigmas = cap.stdDev > 0 ? diff / cap.stdDev : 0;
                  const percentileApprox = Math.round(Math.min(99, Math.max(1, 50 + sigmas * 34)));
                  return (
                    <Card key={cap.key} className="border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cap.colour }} />
                          <span className="text-xs font-semibold text-foreground truncate">{cap.displayName.replace("AI ", "")}</span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{cap.userScore}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">~{percentileApprox}th percentile</div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cap.userScore}%`,
                              backgroundColor: cap.userScore >= 75 ? "#228833" : cap.userScore >= 55 ? "#EE8866" : "#EE6677",
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>Role avg: {cap.roleMean}</span>
                          <span>Platform: {cap.platformMean}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Synthetic data disclaimer */}
              {benchmarkData.isSynthetic && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                  <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Benchmark data note:</span> Role and platform averages are currently
                    based on synthetic reference distributions (norm group version: {benchmarkData.normGroupVersion}).
                    These will be replaced with empirical data as the platform accumulates real assessment results.
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5: SCENARIO CALLBACKS
            Shows the top 5 most signal-rich answers with scenario text, chosen
            option, outcome class, and what the choice reveals about capability.
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="scenarios" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground font-sora">Key Scenario Moments</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The five scenarios that contributed most to your capability profile. Each choice reveals something specific about how you approach AI-assisted HR decisions.
            </p>
          </div>
          {((data as any).scenarioCallbacks ?? []).length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Scenario callback data is not available for this session.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {((data as any).scenarioCallbacks as Array<{
                itemId: string; scenarioText: string; chosenLabel: string; chosenText: string;
                outcomeClass: string | null; revealText: string; capabilityKey: string;
                signalDeltas: Record<string, number>;
              }>).map((cb, idx) => {
                const OUTCOME_COLORS: Record<string, { bg: string; border: string; badge: string; text: string; label: string }> = {
                  strong:     { bg: "bg-[#228833]/8",  border: "border-[#228833]/30", badge: "bg-[#228833]/15 text-[#228833]",  text: "text-[#228833]",  label: "Strong" },
                  acceptable: { bg: "bg-[#44bb99]/8",  border: "border-[#44bb99]/30", badge: "bg-[#44bb99]/15 text-[#44bb99]",  text: "text-[#44bb99]",  label: "Acceptable" },
                  weak:       { bg: "bg-[#EE8866]/8",  border: "border-[#EE8866]/30", badge: "bg-[#EE8866]/15 text-[#EE8866]",  text: "text-[#EE8866]",  label: "Needs Work" },
                  poor:       { bg: "bg-[#CC3311]/8",  border: "border-[#CC3311]/30", badge: "bg-[#CC3311]/15 text-[#CC3311]",  text: "text-[#CC3311]",  label: "Critical Gap" },
                };
                const oc = cb.outcomeClass ?? "weak";
                const colors = OUTCOME_COLORS[oc] ?? OUTCOME_COLORS.weak;
                const topSignals = Object.entries(cb.signalDeltas).sort(([,a],[,b]) => Math.abs(b)-Math.abs(a)).slice(0,3);
                return (
                  <Card key={cb.itemId} className={cn("border-2", colors.border, colors.bg)}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", colors.badge)}>{colors.label}</span>
                          {cb.capabilityKey && (
                            <span className="text-xs text-muted-foreground">· {cb.capabilityKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0">Option {cb.chosenLabel}</span>
                      </div>
                      <blockquote className="text-sm text-foreground leading-relaxed border-l-2 border-border pl-3 italic">
                        &ldquo;{cb.scenarioText}&rdquo;
                      </blockquote>
                      {cb.chosenText && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">You chose:</span> {cb.chosenText}
                        </div>
                      )}
                      <div className={cn("flex items-start gap-2 rounded-lg p-3", colors.bg, "border", colors.border)}>
                        <Sparkles className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", colors.text)} />
                        <p className={cn("text-xs leading-relaxed", colors.text)}>{cb.revealText}</p>
                      </div>
                      {topSignals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {topSignals.map(([sig, delta]) => (
                            <span key={sig} className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                              (delta as number) >= 0 ? "bg-[#228833]/10 text-[#228833] border-[#228833]/20" : "bg-[#CC3311]/10 text-[#CC3311] border-[#CC3311]/20"
                            )}>
                              {sig.replace(/_/g, " ")} {(delta as number) >= 0 ? "+" : ""}{Math.round((delta as number) * 100) / 100}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6: CONFIDENCE CALIBRATION
            Shows how well the participant’s self-assessed confidence matched
            the actual quality of their answers.
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="calibration" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground font-sora">Confidence Calibration</h3>
            <p className="text-sm text-muted-foreground mt-1">
              How well did your confidence match the quality of your answers? Strong calibration is itself a capability signal.
            </p>
          </div>
          {!(data as any).confidenceCalibration ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Calibration data is not available for this session.</p>
              </CardContent>
            </Card>
          ) : (() => {
            const cal = (data as any).confidenceCalibration as {
              overconfidentCount: number; underconfidentCount: number; wellCalibratedCount: number;
              totalAnswers: number; avgConfidence: number; avgConfidenceOnStrong: number;
              avgConfidenceOnWeak: number; calibrationIndex: number | null; summary: string;
            };
            const calibrationScore = cal.totalAnswers > 0
              ? Math.round((cal.wellCalibratedCount / cal.totalAnswers) * 100)
              : 0;
            const calColor = calibrationScore >= 70 ? "#228833" : calibrationScore >= 45 ? "#EE8866" : "#CC3311";
            return (
              <div className="space-y-4">
                {/* Summary banner */}
                <Card className="border-2" style={{ borderColor: `${calColor}40`, backgroundColor: `${calColor}08` }}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-5">
                      <ScoreRing score={calibrationScore} color={calColor} size={90} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Calibration Score</p>
                        <p className="text-sm text-foreground leading-relaxed">{cal.summary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Three-bucket breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-[#228833]/30 bg-[#228833]/5">
                    <CardContent className="p-4 text-center">
                      <ThumbsUp className="w-5 h-5 text-[#228833] mx-auto mb-2" />
                      <div className="text-2xl font-bold text-[#228833]">{cal.wellCalibratedCount}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Well calibrated</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#EE8866]/30 bg-[#EE8866]/5">
                    <CardContent className="p-4 text-center">
                      <ThumbsDown className="w-5 h-5 text-[#EE8866] mx-auto mb-2" />
                      <div className="text-2xl font-bold text-[#EE8866]">{cal.overconfidentCount}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Overconfident</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#CC3311]/30 bg-[#CC3311]/5">
                    <CardContent className="p-4 text-center">
                      <Minus className="w-5 h-5 text-[#CC3311] mx-auto mb-2" />
                      <div className="text-2xl font-bold text-[#CC3311]">{cal.underconfidentCount}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Underconfident</div>
                    </CardContent>
                  </Card>
                </div>
                {/* Confidence vs outcome comparison */}
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Average Confidence by Answer Quality</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">On strong/acceptable answers</span>
                        <span className="font-semibold text-foreground">{cal.avgConfidenceOnStrong}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#228833] transition-all" style={{ width: `${cal.avgConfidenceOnStrong}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">On weak/poor answers</span>
                        <span className="font-semibold text-foreground">{cal.avgConfidenceOnWeak}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#CC3311] transition-all" style={{ width: `${cal.avgConfidenceOnWeak}%` }} />
                      </div>
                    </div>
                    {cal.calibrationIndex !== null && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Calibration index: {cal.calibrationIndex > 0 ? "+" : ""}{cal.calibrationIndex}</span>
                          {" "}(positive = confidence correctly tracks answer quality; negative = overconfident on gaps)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Interpretation guide */}
                <Card className="border-border bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-foreground mb-2">What does calibration mean?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Confidence calibration measures whether your certainty levels matched the actual quality of your decisions. 
                      A well-calibrated professional is certain when they are right and uncertain when they are wrong — this is a 
                      distinct metacognitive skill that predicts real-world AI decision quality.
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
