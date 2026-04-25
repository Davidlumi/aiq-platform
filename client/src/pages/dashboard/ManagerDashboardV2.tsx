/**
 * Manager Dashboard — Peakon Visual Language v2.0
 *
 * Rebuilt with PeakonPrimitives: HeroScore, ReadinessDistributionBar,
 * AIInsightCard, StatTile, PillFilter. Clean light theme.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  DashboardCard,
  DomainDot,
  PriorityBadge,
  EmptyState,
  PeakonScoreBadge,
  RatingBadge,
  CapabilityBar,
} from "@/components/dashboard/DashboardUI";
import {
  HeroScore,
  ReadinessDistributionBar,
  AIInsightCard,
  StatTile,
  PillFilter,
  TrendArrow,
} from "@/components/dashboard/PeakonPrimitives";
import { scoreToColor, formatPeakonScore, scoreToReadinessLabel } from "@/lib/peakon-colors";
import { ManagerDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Users,
  CalendarDays,
  MessageSquareText,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  UserCircle,
  CheckCircle2,
} from "lucide-react";

const DOMAIN_LABELS: Record<string, string> = {
  ai_interaction: "AI Interaction",
  ai_output_evaluation: "AI Output Eval",
  ai_workflow_design: "AI Workflow",
  workforce_ai_readiness: "Workforce AI",
  ai_ethics_trust: "Ethics & Trust",
  ai_change_leadership: "Change Leadership",
};

const DOMAIN_KEYS_ORDERED = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
];

const RATING_LABELS: Record<string, string> = {
  ai_ready: "AI Ready",
  developing: "Developing",
  not_yet_ready: "Not Yet Ready",
  foundation_gap: "Foundation Gap",
  insufficient_evidence: "Insufficient Evidence",
};

const RATING_COLOURS: Record<string, string> = {
  ai_ready: "#10B981",
  developing: "#F59E0B",
  not_yet_ready: "#EF4444",
  foundation_gap: "#F97316",
  insufficient_evidence: "#94A3B8",
};

export default function ManagerDashboardV2() {
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [promptsExpanded, setPromptsExpanded] = useState(false);

  const { data, isLoading } = trpc.dashboardV2.manager.main.useQuery();
  const { data: prompts, isLoading: promptsLoading } = trpc.dashboardV2.manager.conversationPrompts.useQuery();
  const { data: devOverview, isLoading: devLoading } = trpc.dashboardV2.manager.developmentOverview.useQuery();

  if (isLoading) return <ManagerDashboardSkeleton />;
  if (!data) return (
    <div className="p-6 max-w-7xl mx-auto">
      <EmptyState title="No team data" description="You don't have any team members assigned yet." />
    </div>
  );

  const filteredHeatmap = ratingFilter
    ? data.heatmapData.filter(m => m.rating === ratingFilter)
    : data.heatmapData;

  // Team average score
  const teamAvgScore = useMemo(() => {
    const scored = data.heatmapData.filter(m => m.overallScore != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, m) => sum + (m.overallScore ?? 0), 0) / scored.length);
  }, [data.heatmapData]);

  // Readiness distribution
  const readinessDistribution = useMemo(() => {
    const aiReady = data.ratingCounts.ai_ready ?? 0;
    const developing = data.ratingCounts.developing ?? 0;
    const notYetReady = data.ratingCounts.not_yet_ready ?? 0;
    const foundationGap = data.ratingCounts.foundation_gap ?? 0;
    return { aiReady, developing, notYetReady, foundationGap, total: data.teamSize };
  }, [data.ratingCounts, data.teamSize]);

  // AI insights from team data
  const teamInsights = useMemo(() => {
    const ins: string[] = [];
    const aiReadyPct = data.teamSize > 0 ? Math.round(((data.ratingCounts.ai_ready ?? 0) / data.teamSize) * 100) : 0;
    ins.push(`${aiReadyPct}% of your team is AI Ready (${data.ratingCounts.ai_ready ?? 0} of ${data.teamSize} members)`);
    if ((data.ratingCounts.foundation_gap ?? 0) > 0) {
      ins.push(`${data.ratingCounts.foundation_gap} member(s) have a foundation gap — prioritise foundational modules`);
    }
    if (teamAvgScore !== null) {
      ins.push(`Team average: ${formatPeakonScore(teamAvgScore)} — ${scoreToReadinessLabel(teamAvgScore)}`);
    }
    return ins;
  }, [data.ratingCounts, data.teamSize, teamAvgScore]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── 1. Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{data.manager.teamName}</h1>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {data.teamSize} team member{data.teamSize !== 1 ? "s" : ""}
            </span>
            {data.lastTeamActivity && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Last activity {new Date(data.lastTeamActivity).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
        <Link href="/dashboard/personal">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <UserCircle className="w-3.5 h-3.5" />
            Your own journey
          </Button>
        </Link>
      </header>

      {/* ── 2. Hero Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard className="col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Team Average</p>
          <HeroScore
            score={teamAvgScore}
            label={teamAvgScore !== null ? scoreToReadinessLabel(teamAvgScore) : undefined}
            size="xl"
          />
        </DashboardCard>
        <StatTile
          label="AI Ready"
          value={data.ratingCounts.ai_ready ?? 0}
          sub={`of ${data.teamSize} members`}
          colour="#10B981"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatTile
          label="Developing"
          value={data.ratingCounts.developing ?? 0}
          sub="need coaching support"
          colour="#F59E0B"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatTile
          label="At Risk"
          value={(data.ratingCounts.not_yet_ready ?? 0) + (data.ratingCounts.foundation_gap ?? 0)}
          sub="not yet ready / gap"
          colour="#EF4444"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      {/* ── 3. Readiness Distribution ── */}
      <DashboardCard title="Team readiness distribution" subtitle="Click a segment to filter the heatmap below">
        <div className="mt-2">
          <ReadinessDistributionBar
            aiReady={readinessDistribution.aiReady}
            developing={readinessDistribution.developing}
            notYetReady={readinessDistribution.notYetReady}
            foundationGap={readinessDistribution.foundationGap}
            total={readinessDistribution.total}
          />
        </div>
        {/* Quick filter pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(["ai_ready", "developing", "not_yet_ready", "foundation_gap"] as const).map(key => {
            const count = data.ratingCounts[key] ?? 0;
            const isActive = ratingFilter === key;
            return (
              <button
                key={key}
                onClick={() => setRatingFilter(isActive ? null : key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? "border-transparent text-white"
                    : "border-neutral-200 bg-white text-muted-foreground hover:border-neutral-300"
                }`}
                style={isActive ? { backgroundColor: RATING_COLOURS[key] } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: RATING_COLOURS[key] }}
                />
                {RATING_LABELS[key]}
                <span className={`tabular-nums ${isActive ? "text-white/80" : "text-muted-foreground"}`}>({count})</span>
              </button>
            );
          })}
          {ratingFilter && (
            <button
              onClick={() => setRatingFilter(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-200 bg-white text-muted-foreground hover:border-neutral-300 transition-all"
            >
              Clear filter
            </button>
          )}
        </div>
      </DashboardCard>

      {/* ── 4. Team Capability Heatmap ── */}
      <DashboardCard
        title="Team capability heatmap"
        subtitle={ratingFilter ? `Filtered: ${RATING_LABELS[ratingFilter]} · ${filteredHeatmap.length} member${filteredHeatmap.length !== 1 ? "s" : ""}` : `${data.teamSize} team members`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 pr-4 font-semibold text-muted-foreground" style={{ minWidth: 160 }}>Name</th>
                {DOMAIN_KEYS_ORDERED.map(dk => (
                  <th key={dk} className="text-center py-2 px-1 font-semibold text-muted-foreground" style={{ minWidth: 64 }}>
                    <div className="flex flex-col items-center gap-1">
                      <DomainDot domain={dk} size={6} />
                      <span className="text-[10px] leading-tight">{DOMAIN_LABELS[dk]}</span>
                    </div>
                  </th>
                ))}
                <th className="text-center py-2 px-2 font-semibold text-muted-foreground" style={{ minWidth: 64 }}>Overall</th>
                <th className="w-4" />
              </tr>
            </thead>
            <tbody>
              {filteredHeatmap.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No team members match this filter.
                  </td>
                </tr>
              ) : (
                filteredHeatmap.map(member => (
                  <tr
                    key={member.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedMember(member.id)}
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600 shrink-0">
                          {member.name?.split(' ')[0]?.[0]}{member.name?.split(' ')[1]?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[130px]">{member.name}</p>
                          {member.rating && (
                            <p className="text-[10px] text-muted-foreground">{RATING_LABELS[member.rating] ?? member.rating}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {DOMAIN_KEYS_ORDERED.map(dk => {
                      const domainScore = member.domainScores?.[dk as keyof typeof member.domainScores] ?? null;
                      return (
                        <td key={dk} className="py-2 px-1 text-center">
                          {domainScore !== null ? (
                            <div
                              className="w-14 h-8 rounded mx-auto flex items-center justify-center font-mono font-bold text-[11px] tabular-nums text-white"
                              style={{ backgroundColor: scoreToColor(domainScore).bg }}
                            >
                              {formatPeakonScore(domainScore)}
                            </div>
                          ) : (
                            <div className="w-14 h-8 rounded mx-auto flex items-center justify-center text-[10px] text-neutral-300 border border-dashed border-neutral-200">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center">
                      {member.overallScore != null ? (
                        <span
                          className="font-mono font-bold text-xs tabular-nums"
                          style={{ color: scoreToColor(member.overallScore).bg }}
                        >
                          {formatPeakonScore(member.overallScore)}
                        </span>
                      ) : (
                        <span className="text-neutral-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* ── 5. AI Insights ── */}
      {teamInsights.length > 0 && (
        <AIInsightCard title="Team capability insights" insights={teamInsights} />
      )}

      {/* ── 6. Conversation Prompts ── */}
      <DashboardCard title="Conversation prompts" subtitle="Priority-ordered coaching suggestions for your team">
        {promptsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />)}
          </div>
        ) : !prompts || prompts.prompts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No conversation prompts at this time. Your team is on track.</p>
        ) : (
          <div className="space-y-3 mt-1">
            {prompts.prompts.slice(0, promptsExpanded ? undefined : 3).map((prompt, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
              >
                <div className="mt-0.5 shrink-0">
                  <PriorityBadge priority={prompt.priority as "critical" | "high" | "medium" | "low"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">{prompt.memberName}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{prompt.patternId.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{prompt.suggestedAction}</p>
                </div>
                <MessageSquareText className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              </div>
            ))}
            {prompts.prompts.length > 3 && (
              <button
                onClick={() => setPromptsExpanded(!promptsExpanded)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 mt-1"
              >
                {promptsExpanded ? "Show less" : `Show ${prompts.prompts.length - 3} more`}
                <ChevronRight className={`w-3 h-3 transition-transform ${promptsExpanded ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>
        )}
      </DashboardCard>

      {/* ── 7. Team Development Overview ── */}
      <DashboardCard title="Team development" subtitle="Learning plan progress across your team">
        {devLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-neutral-100 animate-pulse" />)}
          </div>
        ) : !devOverview ? (
          <p className="text-xs text-muted-foreground py-4">No development data available.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-800">On track</span>
                </div>
                <span className="text-2xl font-bold tabular-nums text-emerald-700">{devOverview.statusCounts.onTrack}</span>
                <p className="text-[10px] text-emerald-600 mt-1">Progressing as expected</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800">Slipping</span>
                </div>
                <span className="text-2xl font-bold tabular-nums text-amber-700">{devOverview.statusCounts.slipping}</span>
                <p className="text-[10px] text-amber-600 mt-1">Behind expected pace</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">Stalled</span>
                </div>
                <span className="text-2xl font-bold tabular-nums text-red-700">{devOverview.statusCounts.stalled}</span>
                <p className="text-[10px] text-red-600 mt-1">No activity in 14+ days</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Active modules: <strong className="text-foreground font-mono">{devOverview.activeModuleCount}</strong></span>
                <span className="text-muted-foreground">Avg completion: <strong className="text-foreground font-mono">{devOverview.aggregateCompletionRate}%</strong></span>
              </div>
              <Link href="/learning/team">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View details <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </DashboardCard>

      {/* ── Member Drill-down ── */}
      <Sheet open={selectedMember !== null} onOpenChange={v => !v && setSelectedMember(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedMember && <MemberDrillDown userId={selectedMember} onClose={() => setSelectedMember(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Member Drill-down ───────────────────────────────────────────────────────

function MemberDrillDown({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = trpc.dashboardV2.individual.main.useQuery({ userId });

  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full aiq-shimmer-brand shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded-md aiq-shimmer" />
            <div className="h-3 w-24 rounded-md aiq-shimmer" />
          </div>
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg aiq-shimmer" style={{ animationDelay: `${i * 80}ms` }} />)}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No assessment data for this team member.</p>
      </div>
    );
  }

  return (
    <>
      <SheetHeader className="pb-4">
        <SheetTitle className="text-base">{data.user.firstName} {data.user.lastName}</SheetTitle>
        <p className="text-xs text-muted-foreground">{data.user.roleFamily}</p>
      </SheetHeader>

      <div className="mb-5">
        <HeroScore
          score={data.overallScore}
          label={data.overallScore !== null ? scoreToReadinessLabel(data.overallScore) : undefined}
          size="lg"
        />
      </div>

      <div className="space-y-2">
        {data.domains.map(d => (
          <div key={d.key} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 min-w-0">
              <DomainDot domain={d.key} />
              <span className="text-xs text-foreground truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {d.score !== null ? (
                <span
                  className="font-mono font-bold text-xs tabular-nums"
                  style={{ color: scoreToColor(d.score).bg }}
                >
                  {formatPeakonScore(d.score)}
                </span>
              ) : (
                <span className="text-neutral-300 text-xs">—</span>
              )}
              <RatingBadge rating={d.rating} size="sm" />
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <Link href={`/dashboard/personal?userId=${userId}`}>
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
          View full profile <ChevronRight className="w-3 h-3" />
        </Button>
      </Link>
    </>
  );
}
