/**
 * Learner Dashboard — AiQ Platform
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ClipboardList, BookOpen, Library, Play,
  AlertTriangle, Calendar, TrendingUp, CheckCircle,
  XCircle, HelpCircle, BarChart3, Award, ChevronRight,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const CAP_META: Record<string, { label: string; color: string; shortLabel: string }> = {
  ai_interaction:      { label: "AI Interaction",       color: "#4477AA", shortLabel: "INTR" },
  prioritisation:      { label: "Prioritisation",      color: "#AA3377", shortLabel: "PRIO" },
  validation:          { label: "Validation",          color: "#228833", shortLabel: "VALD" },
  ai_output_evaluation:{ label: "Output Evaluation",   color: "#228833", shortLabel: "EVAL" },
  ai_ethics_trust:     { label: "Ethics & Trust",      color: "#AA3377", shortLabel: "ETHI" },
  ai_change_leadership:{ label: "Change Leadership",   color: "#D97706", shortLabel: "CHNG" },
  data_interpretation: { label: "Data Interpretation", color: "#BBBBBB", shortLabel: "DATA" },
};

const READINESS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  safe:    { label: "Safe",             color: "#228833", bg: "#22883315", icon: CheckCircle },
  at_risk: { label: "At Risk",          color: "#EE8866", bg: "#EE886615", icon: AlertTriangle },
  unsafe:  { label: "Unsafe",           color: "#EE6677", bg: "#EE667715", icon: XCircle },
  unknown: { label: "Not Yet Assessed", color: "#9CA3AF", bg: "#9CA3AF15", icon: HelpCircle },
};

function ScoreRing({ score, readiness }: { score: number | null; readiness: string | null }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = score != null ? Math.min(Math.max(score, 0), 100) : 0;
  const dash = (pct / 100) * circ;
  const meta = READINESS_META[readiness ?? "unknown"] ?? READINESS_META.unknown;
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={meta.color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground font-sora">{score != null ? Math.round(score) : "\u2014"}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function CapabilityCard({ capKey, score }: { capKey: string; score: number | null }) {
  const meta = CAP_META[capKey] ?? { label: capKey, color: "#9CA3AF", shortLabel: capKey };
  const band = score == null ? null : score >= 75 ? "strong" : score >= 50 ? "developing" : "needs_support";
  const bandLabel = band === "strong" ? "Strong" : band === "developing" ? "Developing" : band === "needs_support" ? "Needs Support" : "Not assessed";
  const bandColor = band === "strong" ? "#228833" : band === "developing" ? "#EE8866" : band === "needs_support" ? "#EE6677" : "#9CA3AF";
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
        <span className="text-xs font-semibold text-foreground truncate">{meta.label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-foreground font-sora">{score != null ? Math.round(score) : "\u2014"}</span>
        {score != null && <span className="text-xs text-muted-foreground mb-0.5">/ 100</span>}
      </div>
      <div>
        <Progress value={score ?? 0} className="h-1.5" />
        <span className="text-xs mt-1 block" style={{ color: bandColor }}>{bandLabel}</span>
      </div>
    </div>
  );
}

function ScoreHistoryChart({ history }: { history: Array<{ completedAt: Date | null; overallScore: number; readiness: string | null }> }) {
  const data = [...history].reverse().map((h, i) => ({
    label: h.completedAt ? new Date(h.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : `#${i + 1}`,
    score: Math.round(h.overallScore),
  }));
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [`${v}`, "Score"]} />
        <Line type="monotone" dataKey="score" stroke="#4477AA" strokeWidth={2} dot={{ fill: "#4477AA", r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CapabilityRadar({ scores }: { scores: Record<string, number> }) {
  const data = Object.entries(CAP_META).map(([key, meta]) => ({
    subject: meta.shortLabel,
    score: scores[key] ?? 0,
    fullMark: 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Radar name="Score" dataKey="score" stroke="#4477AA" fill="#4477AA" fillOpacity={0.15} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default function LearnerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.dashboard.learner.useQuery();

  const readinessMeta = READINESS_META[data?.latestReadiness ?? "unknown"] ?? READINESS_META.unknown;
  const ReadinessIcon = readinessMeta.icon;

  const daysToRevalidation = useMemo(() => {
    if (!data?.revalidation?.dueAt) return null;
    return Math.ceil((new Date(data.revalidation.dueAt).getTime() - Date.now()) / 86400000);
  }, [data?.revalidation?.dueAt]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const capScores = data?.latestCapabilityScores ?? null;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">Welcome back, {user?.firstName ?? "Learner"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your AI capability intelligence dashboard</p>
        </div>
        <Link href="/assessment">
          <Button size="sm" className="gap-2 bg-[#4477AA] hover:bg-[#4477AA]/90 text-white">
            <ClipboardList className="w-4 h-4" />Take Assessment
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <ScoreRing score={data?.latestOverallScore ?? null} readiness={data?.latestReadiness ?? null} />
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-1"
                style={{ backgroundColor: readinessMeta.bg, color: readinessMeta.color }}>
                <ReadinessIcon className="w-3 h-3" />
                {readinessMeta.label}
              </div>
              <p className="text-xs text-muted-foreground">
                {data?.totalAssessmentsCompleted ?? 0} assessment{data?.totalAssessmentsCompleted !== 1 ? "s" : ""} completed
              </p>
            </div>
            {!data?.latestOverallScore && (
              <Link href="/assessment">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Start your first assessment <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4477AA]" />Capability Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {capScores ? (
              <CapabilityRadar scores={capScores} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Complete an assessment to see your capability profile</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#228833]" />Score History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.scoreHistory && data.scoreHistory.length > 0 ? (
              <ScoreHistoryChart history={data.scoreHistory} />
            ) : (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No assessment history yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {capScores && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Capability Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.keys(CAP_META).map(key => (
              <CapabilityCard key={key} capKey={key} score={(capScores as any)[key] ?? null} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <BookOpen className="w-4 h-4 text-[#228833]" />Learning Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.planProgress ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-foreground font-sora">{data.planProgress.percent}%</span>
                    <span className="text-sm text-muted-foreground ml-2">complete</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{data.planProgress.completed}/{data.planProgress.total} modules</Badge>
                </div>
                <Progress value={data.planProgress.percent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{data.planProgress.inProgress} in progress</span>
                  <span>{data.planProgress.total - data.planProgress.completed} remaining</span>
                </div>
                <Link href="/learning">
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
                    <BookOpen className="w-3 h-3" />View Learning Plan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No active learning plan</p>
                <Link href="/assessment">
                  <Button size="sm" className="bg-[#228833] hover:bg-[#228833]/90 text-white text-xs">Take Assessment to Generate Plan</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <Calendar className="w-4 h-4 text-[#EE8866]" />Revalidation Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.revalidation ? (
              <div className="space-y-3">
                <div className="flex items-end gap-1">
                  <span className={cn("text-4xl font-bold font-sora",
                    daysToRevalidation !== null && daysToRevalidation <= 7 ? "text-[#EE6677]" :
                    daysToRevalidation !== null && daysToRevalidation <= 30 ? "text-[#EE8866]" : "text-foreground")}>
                    {daysToRevalidation}
                  </span>
                  <span className="text-muted-foreground mb-1 text-sm">days remaining</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Due: {new Date(data.revalidation.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                {data.revalidation.triggerReason && (
                  <p className="text-xs text-muted-foreground italic">{data.revalidation.triggerReason}</p>
                )}
                {daysToRevalidation !== null && daysToRevalidation <= 14 && (
                  <Link href="/assessment">
                    <Button size="sm" className="w-full bg-[#EE6677] hover:bg-[#EE6677]/90 text-white text-xs gap-1.5">
                      <AlertTriangle className="w-3 h-3" />Start Revalidation Now
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No revalidation scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(data?.credibility || data?.risk) && (
        <div className="grid grid-cols-2 gap-4">
          {data?.credibility && (
            <Card className="border-border">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-[#4477AA]" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credibility</span>
                </div>
                <p className="text-2xl font-bold text-foreground font-sora capitalize">{data.credibility.band}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Score: {(parseFloat(data.credibility.credibilityScore as unknown as string) * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          )}
          {data?.risk && (
            <Card className="border-border">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-[#EE8866]" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Band</span>
                </div>
                <p className={cn("text-2xl font-bold font-sora capitalize",
                  data.risk.band === "high" ? "text-[#EE6677]" : data.risk.band === "medium" ? "text-[#EE8866]" : "text-[#228833]")}>
                  {data.risk.band}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Score: {(parseFloat(data.risk.riskScore as unknown as string) * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Take Assessment",  path: "/assessment",  icon: ClipboardList, color: "bg-[#4477AA]/8 text-[#4477AA] border-[#4477AA]/20 hover:bg-[#4477AA]/15" },
            { label: "My Learning Plan", path: "/learning",    icon: BookOpen,      color: "bg-[#228833]/8 text-[#228833] border-[#228833]/20 hover:bg-[#228833]/15" },
            { label: "Content Library",  path: "/library",     icon: Library,       color: "bg-[#AA3377]/8 text-[#AA3377] border-[#AA3377]/20 hover:bg-[#AA3377]/15" },
            { label: "Simulations",      path: "/simulations", icon: Play,          color: "bg-[#EE8866]/8 text-[#EE8866] border-[#EE8866]/20 hover:bg-[#EE8866]/15" },
          ].map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.path} href={action.path}>
                <div className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors", action.color)}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
