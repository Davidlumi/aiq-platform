/**
 * Individual Dashboard — Peakon Visual Language v2.0
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  DashboardCard,
  DomainDot,
  CapabilityBar,
  EmptyState,
  PeakonScoreBadge,
  RatingBadge,
  ConfidenceIndicator,
} from "@/components/dashboard/DashboardUI";
import {
  HeroScore,
  Sparkline,
  ReadinessDistributionBar,
  ScoreTrendCard,
  AIInsightCard,
  PillFilter,
} from "@/components/dashboard/PeakonPrimitives";
import { scoreToColor, formatPeakonScore, scoreToReadinessLabel } from "@/lib/peakon-colors";
import { DOMAIN_COLOURS } from "@/lib/domains";
import { IndividualDashboardSkeleton } from "@/components/ui/loading";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
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
  Target,
  ChevronRight,
  Sparkles,
  GraduationCap,
  AlertTriangle,
  Users,
} from "lucide-react";

// DOMAIN_COLOURS imported from @/lib/domains (canonical Paul Tol palette)

export default function IndividualDashboardV2({ userId }: { userId?: string }) {
  const { user } = useAuth();
  const [drillDomain, setDrillDomain] = useState<string | null>(null);
  const [domainView, setDomainView] = useState<string>("cards");

  const { data, isLoading } = trpc.dashboardV2.individual.main.useQuery(
    userId ? { userId } : undefined,
  );

  const isOwnDashboard = !userId || userId === (user as any)?.id;

  const readinessDistribution = useMemo(() => {
    const domains = (data?.domains ?? []).filter(d => d.score !== null);
    let aiReady = 0, developing = 0, notYetReady = 0, foundationGap = 0;
    for (const d of domains) {
      const s = d.score!;
      if (s >= 70) aiReady++;
      else if (s >= 50) developing++;
      else if (s >= 30) notYetReady++;
      else foundationGap++;
    }
    return { aiReady, developing, notYetReady, foundationGap, total: domains.length };
  }, [data?.domains]);

  const scoreHistory = useMemo(
    () => (data?.assessmentHistory ?? []).map(h => h.overallScore),
    [data?.assessmentHistory],
  );

  const scoreDelta = useMemo(() => {
    if (!data || data.assessmentHistory.length < 2) return null;
    const sorted = [...data.assessmentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted[sorted.length - 1].overallScore - sorted[sorted.length - 2].overallScore;
  }, [data]);

  const insights = useMemo(() => {
    if (!data) return [];
    const ins: string[] = [];
    const scored = data.domains.filter(d => d.score !== null);
    const topDomain = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    const weakDomain = [...scored].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    if (topDomain) ins.push(`Strongest capability: ${topDomain.name} (${formatPeakonScore(topDomain.score!)})`);
    if (weakDomain && weakDomain.key !== topDomain?.key) ins.push(`Priority development area: ${weakDomain.name} (${formatPeakonScore(weakDomain.score!)})`);
    if (data.overallScore !== null) ins.push(`Overall readiness: ${scoreToReadinessLabel(data.overallScore)}`);
    if (scoreDelta !== null && scoreDelta !== 0) ins.push(`Score ${scoreDelta > 0 ? "improved" : "declined"} by ${Math.abs(scoreDelta / 10).toFixed(1)} points since last assessment`);
    return ins;
  }, [data, scoreDelta]);

  if (isLoading) return <IndividualDashboardSkeleton />;
  if (!data) return (
    <div className="px-5 py-6 md:px-8 max-w-6xl mx-auto">
      <EmptyState
        title="No data available"
        description="Complete an assessment to see your capability dashboard."
        action={<Link href="/assessment"><Button>Start Assessment</Button></Link>}
      />
    </div>
  );

  return (
    <div className="px-5 py-6 md:px-8 max-w-6xl mx-auto space-y-6">
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
        <div className="flex items-center gap-2">
          {isOwnDashboard && (
            <DownloadPdfButton type="capability_profile" label="Download Profile" size="sm" variant="outline" />
          )}
          {isOwnDashboard && (
            <Link href="/assessment">
              <Button variant="default" size="sm" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {data.overallScore !== null ? "Reassess" : "Start assessment"}
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardCard className="lg:col-span-1">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Overall Score</p>
                <HeroScore
                  score={data.overallScore}
                  label={data.overallScore !== null ? scoreToReadinessLabel(data.overallScore) : undefined}
                  delta={scoreDelta}
                  size="xl"
                />
              </div>
              {scoreHistory.length >= 2 && (
                <Sparkline
                  data={scoreHistory}
                  width={80}
                  height={48}
                  colour={data.overallScore !== null ? scoreToColor(data.overallScore).bg : undefined}
                />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RatingBadge rating={data.overallRating} size="sm" />
              <ConfidenceIndicator band={data.confidenceBand} />
            </div>
            {data.ratingExplanation && (
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-neutral-100 pt-3">
                {data.ratingExplanation}
              </p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard className="lg:col-span-2">
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Readiness Distribution</p>
                <p className="text-xs text-muted-foreground mt-0.5">Across {readinessDistribution.total} capability domains</p>
              </div>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            {readinessDistribution.total > 0 ? (
              <ReadinessDistributionBar
                aiReady={readinessDistribution.aiReady}
                developing={readinessDistribution.developing}
                notYetReady={readinessDistribution.notYetReady}
                foundationGap={readinessDistribution.foundationGap}
                total={readinessDistribution.total}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Complete an assessment to see your distribution.</p>
            )}
            {data.assessmentHistory.length >= 2 && (
              <div className="border-t border-neutral-100 pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Score history</p>
                <ScoreProgressChart history={data.assessmentHistory} target={data.roleTarget} />
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      {insights.length > 0 && (
        <AIInsightCard title="Capability insights" insights={insights} />
      )}

      <DashboardCard
        title="Capability domains"
        subtitle="Click any domain to see detailed breakdown"
        action={
          <PillFilter
            label="View"
            value={domainView}
            options={[
              { value: "cards", label: "Score cards" },
              { value: "trend", label: "Trend view" },
            ]}
            onChange={v => setDomainView(v)}
          />
        }
      >
        {domainView === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
            {data.domains.map(d => (
              <button
                key={d.key}
                onClick={() => setDrillDomain(d.key)}
                className="group text-left p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all bg-card"
                style={d.score !== null ? { borderLeftColor: scoreToColor(d.score).bg, borderLeftWidth: '4px' } : {}}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DomainDot domain={d.key} size={10} />
                    <span className="text-xs font-semibold text-foreground">{d.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                </div>
                <div className="flex items-end justify-between mb-2.5">
                  {d.score !== null ? (
                    <span
                      className="text-3xl font-bold tabular-nums tracking-tight"
                      style={{ color: scoreToColor(d.score).bg }}
                    >
                      {formatPeakonScore(d.score)}
                    </span>
                  ) : (
                    <span className="text-3xl font-bold text-neutral-300">—</span>
                  )}
                  <RatingBadge rating={d.rating} size="sm" />
                </div>
                <CapabilityBar score={d.score} colour={d.colour} height={5} />
                {!d.hasEvidence && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Limited evidence
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
            {data.domains.map(d => (
              <ScoreTrendCard
                key={d.key}
                label={d.name}
                colour={(DOMAIN_COLOURS as Record<string, string>)[d.key] ?? "#94A3B8"}
                currentScore={d.score ?? 0}
                delta={null}
                history={d.score !== null ? [d.score] : []}
                onClick={() => setDrillDomain(d.key)}
              />
            ))}
          </div>
        )}
      </DashboardCard>

      <DashboardCard title="Gap analysis" subtitle="Current score vs role target">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-48">Domain</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground w-20">Current</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground w-20">Target</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground w-20">Gap</th>
                <th className="py-2 pl-4 font-semibold text-muted-foreground">Progress</th>
              </tr>
            </thead>
            <tbody>
              {data.gapHeatmap.map(row => {
                const gapPeakon = row.gapValue !== null ? row.gapValue / 10 : null;
                const gapColour = gapPeakon === null ? "#94A3B8" : gapPeakon <= 0 ? "#7A9E8E" : gapPeakon <= 0.5 ? "#C8B07A" : "#C08878";
                return (
                  <tr key={row.domain} className="border-b border-neutral-100 last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <DomainDot domain={row.domain} />
                        <span className="font-medium text-foreground">{row.domainName}</span>
                      </div>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {row.currentScore !== null ? (
                        <span className="font-mono font-bold tabular-nums text-xs" style={{ color: scoreToColor(row.currentScore).bg }}>
                          {formatPeakonScore(row.currentScore)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
                          {gapPeakon !== null && gapPeakon > 0 ? `+${gapPeakon.toFixed(1)}` : gapPeakon !== null ? gapPeakon.toFixed(1) : "—"}
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
                          colour={(DOMAIN_COLOURS as Record<string, string>)[row.domain] ?? "#94A3B8"}
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

      {data.planSummary && (
        <Link href="/learning?tab=insights">
          <DashboardCard className="cursor-pointer hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Continue your learning plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.planSummary.moduleCount} modules · ~{Math.round(data.planSummary.totalEstimatedMinutes / 60)}h estimated · {data.planSummary.completionPercentage}% complete
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${data.planSummary.completionPercentage}%` }}
                  />
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </div>
          </DashboardCard>
        </Link>
      )}

      <DomainDrillDown
        open={drillDomain !== null}
        onClose={() => setDrillDomain(null)}
        domainKey={drillDomain}
        userId={userId}
      />
    </div>
  );
}

function ScoreProgressChart({ history, target }: {
  history: Array<{ sessionId: string; date: string; overallScore: number; rating: string }>;
  target: number | null;
}) {
  const chartData = useMemo(() =>
    history.map(h => ({
      date: new Date(h.date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      score: parseFloat(formatPeakonScore(h.overallScore)),
    })),
    [history]
  );

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          {target && (
            <ReferenceLine y={parseFloat(formatPeakonScore(target))} stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          <RechartsTooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 11, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            formatter={(value: number) => [`${value}`, "Score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#4477AA"
            strokeWidth={2}
            dot={{ r: 3.5, fill: "#4477AA", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#4477AA", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

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

            <div className="space-y-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <HeroScore
                  score={data.score}
                  label={data.score !== null ? scoreToReadinessLabel(data.score) : undefined}
                  size="lg"
                />
                <div className="flex flex-col gap-2 items-end">
                  <RatingBadge rating={data.rating} size="md" />
                  <ConfidenceIndicator band={data.confidenceBand} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.narrativeExplanation}</p>
              {data.gapStatement && (
                <div className="p-3 rounded-lg bg-[#CCBB44]/8 border border-[#CCBB44]/25">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-[#99882A] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#7A6E22]">{data.gapStatement}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="py-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Signal breakdown</h4>
              {data.signals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No signal data available for this domain.</p>
              ) : (
                <div className="space-y-2">
                  {data.signals.map(s => (
                    <div key={s.signalKey} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.level === "Strong" ? "#7A9E8E" : s.level === "Developing" ? "#C8B07A" : "#C08878" }} />
                        <span className="text-xs text-foreground truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PeakonScoreBadge score={s.score} />
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {s.level}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {data.developmentModules.length > 0 && (
              <div className="py-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Development modules</h4>
                <div className="space-y-2">
                  {data.developmentModules.map(m => (
                    <Link key={m.moduleId} href={`/learning/module/${m.moduleId}`}>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">{m.title}</span>
                        </div>
                        <Badge variant={m.status === "completed" ? "default" : "outline"} className="text-xs">
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
