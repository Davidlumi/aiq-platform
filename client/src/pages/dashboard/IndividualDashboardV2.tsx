/**
 * Individual Dashboard — AiQ Dashboard Specification v1.1
 *
 * 6 components: Header, Overall Score, Score Progress, Domain Cards,
 * Gap Heatmap, Learning Link. Plus domain drill-down slide-over.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  RatingBadge,
  ScoreDisplay,
  PeakonScoreCell,
  PeakonScoreBadge,
  ConfidenceIndicator,
  DashboardCard,
  CapabilityBar,
  DomainDot,
  InfoTip,
  EmptyState,
  DrillChevron,
  HeatmapCell,
  PriorityBadge,
} from "@/components/dashboard/DashboardUI";
import { scoreToColor, formatPeakonScore } from "@/lib/peakon-colors";
import { IndividualDashboardSkeleton } from "@/components/ui/loading";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  CalendarDays,
  Clock,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Target,
  ChevronRight,
  Sparkles,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";

const DOMAIN_LABELS: Record<string, string> = {
  ai_interaction: "AI Interaction",
  ai_output_evaluation: "AI Output Evaluation",
  ai_workflow_design: "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust: "AI Ethics & Trust",
  ai_change_leadership: "AI Change Leadership",
};

const DOMAIN_COLOURS: Record<string, string> = {
  ai_interaction: "#3B82F6",
  ai_output_evaluation: "#8B5CF6",
  ai_workflow_design: "#10B981",
  workforce_ai_readiness: "#F59E0B",
  ai_ethics_trust: "#EF4444",
  ai_change_leadership: "#06B6D4",
};

export default function IndividualDashboardV2({ userId }: { userId?: string }) {
  const { user } = useAuth();
  const [drillDomain, setDrillDomain] = useState<string | null>(null);

  const { data, isLoading } = trpc.dashboardV2.individual.main.useQuery(
    userId ? { userId } : undefined,
  );

  if (isLoading) return <IndividualDashboardSkeleton />;
  if (!data) return <div className="p-6 max-w-6xl mx-auto"><EmptyState title="No data available" description="Complete an assessment to see your capability dashboard." action={<Link href="/assessment"><Button>Start Assessment</Button></Link>} /></div>;

  const isOwnDashboard = !userId || userId === (user as any)?.id;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── 1. Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isOwnDashboard ? "Your capability profile" : `${data.user.firstName} ${data.user.lastName}`}
          </h1>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            {data.user.roleFamily && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {data.user.roleFamily}
              </span>
            )}
            {data.lastAssessmentDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Last assessed {new Date(data.lastAssessmentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            {data.nextReassessmentDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Next reassessment {new Date(data.nextReassessmentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
        {isOwnDashboard && (
          <Link href="/assessment">
            <Button variant="default" size="sm" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {data.overallScore !== null ? "Reassess" : "Start assessment"}
            </Button>
          </Link>
        )}
      </header>

      {/* ── 2. Overall Score + Rating Hero ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardCard className="lg:col-span-1">
          <div className="flex flex-col items-center text-center py-2">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Overall Score</p>
            <ScoreDisplay score={data.overallScore} size="lg" peakon />
            <div className="mt-3">
              <RatingBadge rating={data.overallRating} size="lg" />
            </div>
            <div className="mt-3">
              <ConfidenceIndicator band={data.confidenceBand} />
            </div>
            <p className="text-xs text-muted-foreground mt-3 max-w-[260px] leading-relaxed">
              {data.ratingExplanation}
            </p>
          </div>
        </DashboardCard>

        {/* ── 3. Score Progress Over Time ── */}
        <DashboardCard title="Score progress" subtitle="Assessment history over time" className="lg:col-span-2">
          {data.assessmentHistory.length < 2 ? (
            <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
              Complete more assessments to see your progress trend.
            </div>
          ) : (
            <ScoreProgressChart history={data.assessmentHistory} target={data.roleTarget} />
          )}
        </DashboardCard>
      </div>

      {/* ── 4. Per-Domain Scores ── */}
      <DashboardCard title="Capability domains" subtitle="Click any domain to see detailed breakdown">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
          {data.domains.map(d => (
            <button
              key={d.key}
              onClick={() => setDrillDomain(d.key)}
              className="group text-left p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DomainDot domain={d.key} size={10} />
                  <span className="text-xs font-semibold text-foreground">{d.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
              </div>
              <div className="flex items-end justify-between mb-2">
                <PeakonScoreCell score={d.score} size="md" />
                <RatingBadge rating={d.rating} size="sm" />
              </div>
              <CapabilityBar score={d.score} colour={d.colour} height={6} />
              {!d.hasEvidence && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Limited evidence
                </p>
              )}
            </button>
          ))}
        </div>
      </DashboardCard>

      {/* ── 5. Gap Analysis Heatmap ── */}
      <DashboardCard title="Gap analysis" subtitle="Current score vs role target">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 pr-4 font-semibold text-muted-foreground w-48">Domain</th>
                <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-20">Current</th>
                <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-20">Target</th>
                <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-20">Gap</th>
                <th className="py-2 pl-4 font-semibold text-muted-foreground">Progress</th>
              </tr>
            </thead>
            <tbody>
              {data.gapHeatmap.map(row => {
                const gapColour = row.gapValue === null ? "#94A3B8" : row.gapValue <= 0 ? "#10B981" : row.gapValue <= 5 ? "#F59E0B" : "#EF4444";
                return (
                  <tr key={row.domain} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <DomainDot domain={row.domain} />
                        <span className="font-medium text-foreground">{row.domainName}</span>
                      </div>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <PeakonScoreCell score={row.currentScore} size="sm" />
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {row.targetScore != null ? (
                        <span className="font-mono font-semibold tabular-nums text-xs text-muted-foreground">{formatPeakonScore(row.targetScore)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {row.gapValue !== null ? (
                        <span className="font-mono font-semibold tabular-nums text-xs" style={{ color: gapColour }}>
                          {row.gapValue > 0 ? `+${row.gapValue}` : row.gapValue}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-4">
                      {row.currentScore !== null && (
                        <CapabilityBar
                          score={row.currentScore}
                          target={row.targetScore}
                          colour={DOMAIN_COLOURS[row.domain] ?? "#94A3B8"}
                          height={6}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* ── 6. Learning Link ── */}
      {data.planSummary && (
        <Link href="/learning">
          <DashboardCard className="cursor-pointer hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Development plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.planSummary.moduleCount} modules · ~{Math.round(data.planSummary.totalEstimatedMinutes / 60)}h estimated · {data.planSummary.completionPercentage}% complete
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-500"
                    style={{ width: `${data.planSummary.completionPercentage}%` }}
                  />
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-brand transition-colors" />
              </div>
            </div>
          </DashboardCard>
        </Link>
      )}

      {/* ── Domain Drill-down Slide-over ── */}
      <DomainDrillDown
        open={drillDomain !== null}
        onClose={() => setDrillDomain(null)}
        domainKey={drillDomain}
        userId={userId}
      />
    </div>
  );
}

// ─── Score Progress Chart ────────────────────────────────────────────────────

function ScoreProgressChart({ history, target }: {
  history: Array<{ sessionId: string; date: string; overallScore: number; rating: string }>;
  target: number | null;
}) {
  const chartData = useMemo(() =>
    history.map(h => ({
      date: new Date(h.date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      score: h.overallScore,
    })),
    [history]
  );

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          {target && (
            <ReferenceLine y={target} stroke="#1E293B" strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          <RechartsTooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            formatter={(value: number) => [`${value}`, "Score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Domain Drill-down ───────────────────────────────────────────────────────

function DomainDrillDown({ open, onClose, domainKey, userId }: {
  open: boolean;
  onClose: () => void;
  domainKey: string | null;
  userId?: string;
}) {
  const { data, isLoading } = trpc.dashboardV2.individual.domainDetail.useQuery(
    { domainKey: domainKey ?? "", userId },
    { enabled: open && domainKey !== null },
  );

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-lg bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <DomainDot domain={data.domainKey} size={12} />
                <SheetTitle className="text-base">{data.domainName}</SheetTitle>
              </div>
            </SheetHeader>

            {/* Section A: Light — Summary */}
            <div className="space-y-4 pb-4">
              <div className="flex items-center gap-4">
                <ScoreDisplay score={data.score} size="lg" peakon />
                <div>
                  <RatingBadge rating={data.rating} size="md" />
                  <div className="mt-1">
                    <ConfidenceIndicator band={data.confidenceBand} />
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.narrativeExplanation}</p>
              {data.gapStatement && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">{data.gapStatement}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Section B: Medium — Signal Breakdown */}
            <div className="py-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signal breakdown</h4>
              {data.signals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No signal data available for this domain.</p>
              ) : (
                <div className="space-y-2">
                  {data.signals.map(s => (
                    <div key={s.signalKey} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.level === "Strong" ? "bg-emerald-500" : s.level === "Developing" ? "bg-amber-500" : "bg-red-500"}`} />
                        <span className="text-xs text-foreground truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PeakonScoreBadge score={s.score} />
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {s.level}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Section D: Development Context */}
            {data.developmentModules.length > 0 && (
              <div className="py-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Development modules</h4>
                <div className="space-y-2">
                  {data.developmentModules.map(m => (
                    <Link key={m.moduleId} href={`/learning/module/${m.moduleId}`}>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">{m.title}</span>
                        </div>
                        <Badge variant={m.status === "completed" ? "default" : "outline"} className="text-[10px]">
                          {m.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
