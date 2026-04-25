/**
 * Manager Dashboard — AiQ Dashboard Specification v1.1
 *
 * 5 components: Header, Team Rating Distribution, Team Domain Heatmap,
 * Conversation Prompts, Team Development Overview.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  RatingBadge,
  ScoreDisplay,
  DashboardCard,
  HeatmapCell,
  DomainDot,
  PriorityBadge,
  EmptyState,
  DrillChevron,
  CapabilityBar,
} from "@/components/dashboard/DashboardUI";
import { ManagerDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Users,
  CalendarDays,
  MessageSquareText,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  UserCircle,
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

  const { data, isLoading } = trpc.dashboardV2.manager.main.useQuery();
  const { data: prompts, isLoading: promptsLoading } = trpc.dashboardV2.manager.conversationPrompts.useQuery();
  const { data: devOverview, isLoading: devLoading } = trpc.dashboardV2.manager.developmentOverview.useQuery();

  if (isLoading) return <ManagerDashboardSkeleton />;
  if (!data) return <div className="p-6 max-w-7xl mx-auto"><EmptyState title="No team data" description="You don't have any team members assigned yet." /></div>;

  const filteredHeatmap = ratingFilter
    ? data.heatmapData.filter(m => m.rating === ratingFilter)
    : data.heatmapData;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 2. Team Rating Distribution ── */}
        <DashboardCard title="Team readiness" subtitle="Click a bar to filter the heatmap" className="lg:col-span-1">
          <div className="space-y-3 mt-2">
            {(["ai_ready", "developing", "not_yet_ready", "foundation_gap", "insufficient_evidence"] as const).map(key => {
              const count = data.ratingCounts[key] ?? 0;
              const pct = data.teamSize > 0 ? Math.round((count / data.teamSize) * 100) : 0;
              const isActive = ratingFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setRatingFilter(isActive ? null : key)}
                  className={`w-full text-left group transition-all rounded-lg p-2 -mx-2 ${isActive ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{RATING_LABELS[key]}</span>
                    <span className="font-mono text-xs font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: RATING_COLOURS[key] }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </DashboardCard>

        {/* ── 3. Team Domain Heatmap ── */}
        <DashboardCard
          title="Team capability heatmap"
          subtitle={ratingFilter ? `Filtered: ${RATING_LABELS[ratingFilter]}` : "All team members"}
          className="lg:col-span-2"
          action={ratingFilter ? (
            <Button variant="ghost" size="sm" onClick={() => setRatingFilter(null)} className="text-xs">
              Clear filter
            </Button>
          ) : undefined}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground w-40">Name</th>
                  {DOMAIN_KEYS_ORDERED.map(dk => (
                    <th key={dk} className="text-center py-2 px-1 font-semibold text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <DomainDot domain={dk} size={6} />
                        <span className="text-[10px] leading-tight">{DOMAIN_LABELS[dk]}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 font-semibold text-muted-foreground w-16">Overall</th>
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
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-semibold text-neutral-600 shrink-0">
                            {member.name?.split(' ')[0]?.[0]}{member.name?.split(' ')[1]?.[0]}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[120px]">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      {DOMAIN_KEYS_ORDERED.map(dk => {
                        const domainScore = member.domainScores?.[dk as keyof typeof member.domainScores] ?? null;
                        return (
                          <td key={dk} className="py-2 px-1 text-center">
                            <HeatmapCell score={domainScore} size="sm" />
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center">
                        <span className="font-mono text-xs font-semibold tabular-nums">{member.overallScore ?? "—"}</span>
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
      </div>

      {/* ── 4. Conversation Prompts ── */}
      <DashboardCard title="Conversation prompts" subtitle="Priority-ordered coaching suggestions for your team">
        {promptsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />)}
          </div>
        ) : !prompts || prompts.prompts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No conversation prompts at this time. Your team is on track.</p>
        ) : (
          <div className="space-y-3 mt-1">
            {prompts.prompts.slice(0, 5).map((prompt, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
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
          </div>
        )}
      </DashboardCard>

      {/* ── 5. Team Development Overview ── */}
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
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-foreground">On track</span>
                </div>
                <span className="font-mono text-2xl font-semibold tabular-nums text-emerald-600">{devOverview.statusCounts.onTrack}</span>
                <p className="text-[10px] text-muted-foreground mt-1">Progressing as expected</p>
              </div>
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-foreground">Slipping</span>
                </div>
                <span className="font-mono text-2xl font-semibold tabular-nums text-amber-600">{devOverview.statusCounts.slipping}</span>
                <p className="text-[10px] text-muted-foreground mt-1">Behind expected pace</p>
              </div>
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-foreground">Stalled</span>
                </div>
                <span className="font-mono text-2xl font-semibold tabular-nums text-red-600">{devOverview.statusCounts.stalled}</span>
                <p className="text-[10px] text-muted-foreground mt-1">No activity in 14+ days</p>
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

// ─── Member Drill-down (opens Individual Dashboard in slide-over) ────────────

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

      <div className="flex items-center gap-4 mb-4">
        <ScoreDisplay score={data.overallScore} size="lg" />
        <RatingBadge rating={data.overallRating} size="md" />
      </div>

      <div className="space-y-2">
        {data.domains.map(d => (
          <div key={d.key} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 min-w-0">
              <DomainDot domain={d.key} />
              <span className="text-xs text-foreground truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs font-semibold tabular-nums w-8 text-right">{d.score}</span>
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
