/**
 * Leader Dashboard — Peakon Visual Language v2.0
 *
 * Rebuilt with PeakonPrimitives: HeroScore, StatTile, AIInsightCard,
 * ReadinessDistributionBar, ScoreTrendCard. Clean light theme.
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
  DeltaIndicator,
} from "@/components/dashboard/DashboardUI";
import {
  HeroScore,
  StatTile,
  AIInsightCard,
  ReadinessDistributionBar,
  ScoreTrendCard,
  PillFilter,
  Sparkline,
} from "@/components/dashboard/PeakonPrimitives";
import { scoreToColor, formatPeakonScore, scoreToReadinessLabel } from "@/lib/peakon-colors";
import { DOMAIN_LABELS, DOMAIN_COLOURS } from "@/lib/domains";
import { LeaderDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  UserCircle,
  ChevronRight,
  Target,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { PeakonHeatmap } from "@/components/dashboard/PeakonHeatmap";

// DOMAIN_LABELS and DOMAIN_COLOURS imported from @/lib/domains (canonical Paul Tol palette)

const RATING_LABELS: Record<string, string> = {
  ai_ready: "AI Ready",
  developing: "Developing",
  not_yet_ready: "Not Yet Ready",
  foundation_gap: "Foundation Gap",
  insufficient_evidence: "Insufficient Evidence",
};

const RATING_COLOURS: Record<string, string> = {
  ai_ready: "#7A9E8E",
  developing: "#C8B07A",
  not_yet_ready: "#C08878",
  foundation_gap: "#A87868",
  insufficient_evidence: "#B0B8C4",
};

const RATING_KEYS = ["ai_ready", "developing", "not_yet_ready", "foundation_gap", "insufficient_evidence"] as const;

const ROLE_FAMILY_OPTIONS = [
  { value: "business_partnering", label: "Business Partnering" },
  { value: "talent_acquisition", label: "Talent Acquisition" },
  { value: "learning_development", label: "Learning & Development" },
  { value: "reward_analytics", label: "Reward & Analytics" },
  { value: "er_specialists", label: "ER & Specialists" },
  { value: "operations_tech", label: "Operations & Tech" },
  { value: "hr_leadership", label: "HR Leadership" },
];

export default function LeaderDashboardV2() {
  const [roleFamily, setRoleFamily] = useState<string | undefined>(undefined);

  const queryInput = useMemo(
    () => (roleFamily ? { roleFamily } : undefined),
    [roleFamily],
  );

  const { data: hero, isLoading: heroLoading } = trpc.dashboardV2.leader.heroFinding.useQuery(queryInput);
  const { data: main, isLoading: mainLoading } = trpc.dashboardV2.leader.main.useQuery(queryInput);
  const { data: trajectory, isLoading: trajLoading } = trpc.dashboardV2.leader.domainTrajectory.useQuery(queryInput);
  const { data: findings, isLoading: findingsLoading } = trpc.dashboardV2.leader.strategicFindings.useQuery(queryInput);
  const { data: teams, isLoading: teamsLoading } = trpc.dashboardV2.leader.teams.useQuery(queryInput);
  const { data: alignment, isLoading: alignmentLoading } = trpc.dashboardV2.leader.strategicAlignment.useQuery(queryInput);

  const isLoading = heroLoading || mainLoading;

  // AI insights for the function — declared before early return to satisfy Rules of Hooks
  const functionInsights = useMemo(() => {
    if (!main) return [];
    const ins: string[] = [];
    const aiReadyPct = main.totalHeadcount > 0 ? Math.round(((main.ratingCounts.ai_ready ?? 0) / main.totalHeadcount) * 100) : 0;
    ins.push(`${aiReadyPct}% of the function is AI Ready (${main.ratingCounts.ai_ready ?? 0} of ${main.totalHeadcount})`);
    if ((main.ratingCounts.foundation_gap ?? 0) > 0) {
      ins.push(`${main.ratingCounts.foundation_gap} employees have a foundation gap — urgent intervention needed`);
    }
    if (main.functionScore !== null) {
      ins.push(`Function average: ${formatPeakonScore(main.functionScore)} — ${scoreToReadinessLabel(main.functionScore)}`);
    }
    if (main.trajectory90d !== null && main.trajectory90d !== 0) {
      ins.push(`90-day trajectory: ${main.trajectory90d > 0 ? "+" : ""}${(main.trajectory90d / 10).toFixed(1)} pts — ${main.trajectory90d > 0 ? "improving" : "declining"}`);
    }
    return ins;
  }, [main]);

  if (isLoading) return <LeaderDashboardSkeleton />;

  return (
    <div className="px-5 py-6 md:px-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-xl font-semibold text-foreground">HR Function Overview</h1>
          <p className="text-xs text-muted-foreground mt-1">
            AI capability intelligence across your entire HR function
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select
              value={roleFamily ?? "__all__"}
              onValueChange={(v) => setRoleFamily(v === "__all__" ? undefined : v)}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All departments</SelectItem>
                {ROLE_FAMILY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Link href="/dashboard/personal">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <UserCircle className="w-3.5 h-3.5" />
              My Capability Profile
            </Button>
          </Link>
        </div>
      </header>

      {/* Active filter indicator */}
      {roleFamily && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
          <Filter className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs text-foreground">
            Filtered to <strong>{ROLE_FAMILY_OPTIONS.find(o => o.value === roleFamily)?.label ?? roleFamily}</strong>
          </span>
          <button
            onClick={() => setRoleFamily(undefined)}
            className="ml-auto text-xs text-indigo-600 hover:underline font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── 1. Hero Finding ── */}
      {hero && (
        <HeroFindingCard
          status={hero.readinessStatus}
          statement={hero.statement}
          cta={hero.cta}
          functionScore={hero.functionScore}
          assessedCount={hero.assessedCount}
          totalHeadcount={hero.totalHeadcount}
        />
      )}

      {/* ── 2. Function Overview Stats ── */}
      {main && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard className="col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Function Score</p>
            <HeroScore
              score={main.functionScore}
              label={main.functionScore !== null ? scoreToReadinessLabel(main.functionScore) : undefined}
              delta={main.trajectory90d}
              size="xl"
            />
            <div className="mt-3">
              <RatingBadge rating={main.functionRating} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {main.assessedCount}/{main.totalHeadcount} assessed
            </p>
          </DashboardCard>
          <StatTile
            label="AI Ready"
            value={main.ratingCounts.ai_ready ?? 0}
            sub={`${main.totalHeadcount > 0 ? Math.round(((main.ratingCounts.ai_ready ?? 0) / main.totalHeadcount) * 100) : 0}% of function`}
            colour="#7A9E8E"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <StatTile
            label="Developing"
            value={main.ratingCounts.developing ?? 0}
            sub="need targeted support"
            colour="#C8B07A"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatTile
            label="At Risk"
            value={(main.ratingCounts.not_yet_ready ?? 0) + (main.ratingCounts.foundation_gap ?? 0)}
            sub="not ready / foundation gap"
            colour="#C08878"
            icon={<AlertTriangle className="w-4 h-4" />}
          />
        </div>
      )}

      {/* ── 3. Readiness Distribution ── */}
      {main && (
        <DashboardCard title="Function readiness distribution" subtitle="Headcount breakdown across all assessed employees">
          <div className="mt-2">
            <ReadinessDistributionBar
              aiReady={main.ratingCounts.ai_ready ?? 0}
              developing={main.ratingCounts.developing ?? 0}
              notYetReady={main.ratingCounts.not_yet_ready ?? 0}
              foundationGap={main.ratingCounts.foundation_gap ?? 0}
              total={main.totalHeadcount}
            />
          </div>
        </DashboardCard>
      )}

      {/* ── 4. AI Insights ── */}
      {functionInsights.length > 0 && (
        <AIInsightCard title="Function capability insights" insights={functionInsights} />
      )}

      {/* ── 5. Domain Distribution ── */}
      {main && main.domainDistribution && (
        <DashboardCard title="Domain capability distribution" subtitle="Rating breakdown per capability domain">
          <div className="space-y-3 mt-2">
            {main.domainDistribution.map((dd: any) => {
              const total = dd.totalAssessed || 1;
              return (
                <div key={dd.domain} className="flex items-center gap-3 pl-2 border-l-4 rounded-sm" style={dd.avgScore !== null ? { borderLeftColor: scoreToColor(dd.avgScore).bg } : { borderLeftColor: '#e5e7eb' }}>
                  <div className="flex items-center gap-2 w-40 shrink-0">
                    <DomainDot domain={dd.domain} />
                    <span className="text-xs font-medium text-foreground truncate">{dd.domainName}</span>
                  </div>
                  <div className="flex-1 h-6 rounded-full bg-neutral-100 overflow-hidden flex">
                    {RATING_KEYS.map(rk => {
                      const count = dd.ratingCounts?.[rk] ?? 0;
                      const pct = Math.round((count / total) * 100);
                      if (pct === 0) return null;
                      return (
                        <div
                          key={rk}
                          className="h-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: RATING_COLOURS[rk] }}
                          title={`${RATING_LABELS[rk]}: ${count} (${pct}%)`}
                        />
                      );
                    })}
                  </div>
                  <span className="shrink-0 w-12 text-right">
                    {dd.avgScore !== null ? (
                      <span
                        className="font-mono font-bold text-xs tabular-nums"
                        style={{ color: scoreToColor(dd.avgScore).bg }}
                      >
                        {formatPeakonScore(dd.avgScore)}
                      </span>
                    ) : (
                      <span className="text-neutral-300 text-xs">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {RATING_KEYS.map(rk => (
              <div key={rk} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RATING_COLOURS[rk] }} />
                <span className="text-xs text-muted-foreground">{RATING_LABELS[rk]}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* ── 6. Peakon-Style Capability Heatmap ── */}
      {main && main.heatmap && (
        <DashboardCard
          title="Capability heatmap"
          subtitle="Average score by segment and domain — colour intensity indicates capability level"
        >
          <PeakonHeatmap
            heatmap={main.heatmap}
            domainLabels={DOMAIN_LABELS}
            departmentOptions={ROLE_FAMILY_OPTIONS}
          />
        </DashboardCard>
      )}

      {/* ── 7. Domain Trajectory ── */}
      {!trajLoading && trajectory && trajectory.domains && (
        <DashboardCard title="Domain trajectory" subtitle="Function-wide average score over time per domain">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {trajectory.domains.map((d: any) => {
              const history = d.timeSeries.map((ts: any) => ts.avgScore).filter((v: any) => v != null);
              return (
                <ScoreTrendCard
                  key={d.domain}
                  label={d.domainName}
                  colour={(DOMAIN_COLOURS as Record<string, string>)[d.domain] ?? d.colour ?? "#94A3B8"}
                  currentScore={d.currentValue ?? 0}
                  delta={d.delta90d}
                  history={history.length >= 2 ? history : (d.currentValue ? [d.currentValue] : [])}
                />
              );
            })}
          </div>
        </DashboardCard>
      )}

      {/* ── 8. Strategic Alignment ── */}
      {!alignmentLoading && alignment && (
        <StrategicAlignmentSection alignment={alignment} />
      )}

      {/* ── 9. Strategic Findings ── */}
      {!findingsLoading && findings && (
        <DashboardCard title="Strategic findings" subtitle="Priority-ordered insights for your function">
          {findings.findings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No strategic findings at this time. Findings are generated once assessment data is available.</p>
          ) : (
            <div className="space-y-3 mt-1">
              {findings.findings.map((f: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    <div className="mt-0.5 shrink-0">
                      <PriorityBadge priority={f.priority} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{f.observation}</p>
                      {f.supportingData && (
                        <p className="text-xs text-muted-foreground mt-1.5 font-mono bg-neutral-50 rounded px-2 py-1 inline-block">
                          {f.supportingData}
                        </p>
                      )}
                    </div>
                    <Lightbulb className="w-4 h-4 text-[#CCBB44] shrink-0 mt-0.5" />
                  </div>
                  {f.strategicImplication && (
                    <div className="px-3 pb-3 pt-0 ml-9">
                      <div className="text-xs text-muted-foreground leading-relaxed bg-blue-50/50 border border-blue-100 rounded-md px-3 py-2">
                        <span className="font-semibold text-blue-700">Strategic implication:</span>{" "}
                        {f.strategicImplication}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      )}

      {/* ── 10. Teams Overview ── */}
      {!teamsLoading && teams && teams.teams.length > 0 && (
        <DashboardCard title="Teams" subtitle="Overview of manager teams in your function">
          <div className="space-y-2 mt-1">
            {teams.teams.map((team: any) => (
              <div key={team.managerId} className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600">
                    {team.managerName?.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{team.managerName}</p>
                    <p className="text-xs text-muted-foreground">{team.teamSize} members</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {team.avgScore !== null && (
                    <span
                      className="font-mono font-bold text-sm tabular-nums"
                      style={{ color: scoreToColor(team.avgScore).bg }}
                    >
                      {formatPeakonScore(team.avgScore)}
                    </span>
                  )}
                  <div className="flex gap-0.5">
                    {RATING_KEYS.map(rk => {
                      const count = team.ratingDistribution?.[rk] ?? 0;
                      if (count === 0) return null;
                      return (
                        <div
                          key={rk}
                          className="h-4 rounded-sm min-w-[4px]"
                          style={{ width: Math.max(4, count * 8), backgroundColor: RATING_COLOURS[rk] }}
                          title={`${RATING_LABELS[rk]}: ${count}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  );
}

// ─── Hero Finding Card ───────────────────────────────────────────────────────

function HeroFindingCard({
  status,
  statement,
  cta,
  functionScore,
  assessedCount,
  totalHeadcount,
}: {
  status: string;
  statement: string;
  cta: { label: string; route: string } | null;
  functionScore: number | null;
  assessedCount: number;
  totalHeadcount: number;
}) {
  const statusStyles: Record<string, { bg: string; border: string; iconColour: string; icon: typeof TrendingUp }> = {
    on_track: { bg: "#F0F4F0", border: "#B8CEB8", iconColour: "#228833", icon: TrendingUp },
    at_risk: { bg: "#F5EFEE", border: "#D4B0A8", iconColour: "#EE6677", icon: AlertTriangle },
    mixed: { bg: "#F7F3EC", border: "#D8C89A", iconColour: "#CCBB44", icon: BarChart3 },
    partial: { bg: "#F8FAFC", border: "#CBD5E1", iconColour: "#64748B", icon: Target },
    not_configured: { bg: "#F8FAFC", border: "#CBD5E1", iconColour: "#64748B", icon: Target },
  };
  const style = statusStyles[status] ?? statusStyles.not_configured;
  const Icon = style.icon;

  return (
    <div
      className="p-5 rounded-xl border"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${style.border}80` }}>
          <Icon className="w-5 h-5" style={{ color: style.iconColour }} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground leading-relaxed">{statement}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {functionScore !== null && (
              <span className="text-xs text-muted-foreground">
                Function score: <strong className="font-mono" style={{ color: scoreToColor(functionScore).bg }}>{formatPeakonScore(functionScore)}</strong>
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {assessedCount}/{totalHeadcount} assessed
            </span>
            {cta && (
              <Link href={cta.route}>
                <Button variant="outline" size="sm" className="text-xs gap-1 h-7">
                  {cta.label} <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Strategic Alignment Section ────────────────────────────────────────────

const ALIGNMENT_STYLES = {
  aligned: { bg: "#F0F4F0", border: "#B8CEB8", text: "#065F46", label: "Aligned", icon: "✓" },
  partial: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", label: "Partial", icon: "◐" },
  gap: { bg: "#F5EFEE", border: "#D4B0A8", text: "#991B1B", label: "Gap", icon: "✗" },
  unknown: { bg: "#F1F5F9", border: "#CBD5E1", text: "#475569", label: "Unknown", icon: "?" },
};

const OVERALL_ALIGNMENT_STYLES = {
  aligned: { bg: "#F0F4F0", border: "#7A9E8E", text: "#2D5A3D", label: "HR capability is aligned with business strategy" },
  partial: { bg: "#F7F3EC", border: "#C8B07A", text: "#6B4F1E", label: "Partial alignment — some strategic priorities have capability gaps" },
  misaligned: { bg: "#F4EEEC", border: "#C08878", text: "#6B3030", label: "Significant misalignment — HR capability does not support business strategy" },
};

const GOVERNANCE_STYLES = {
  strong: { bg: "#F0F4F0", text: "#2D5A3D", label: "Strong", desc: "Governance framework, ethics committee, and policies in place" },
  developing: { bg: "#F7F3EC", text: "#6B4F1E", label: "Developing", desc: "Some governance structures exist but gaps remain" },
  weak: { bg: "#F4EEEC", text: "#6B3030", label: "Weak", desc: "Limited governance infrastructure for AI oversight" },
};

function StrategicAlignmentSection({ alignment }: { alignment: any }) {
  if (!alignment.configured) {
    return (
      <DashboardCard title="Strategic alignment" subtitle="HR capability vs. business strategy">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Strategic context not configured</p>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            Define your AI strategic priorities in Organisation Context to see how your HR function's capability aligns with business strategy.
          </p>
          <Link href="/admin/org-context">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Configure strategic priorities
            </Button>
          </Link>
        </div>
      </DashboardCard>
    );
  }

  if (alignment.priorities.length === 0) {
    return (
      <DashboardCard title="Strategic alignment" subtitle="HR capability vs. business strategy">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">No strategic priorities defined</p>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            Add your AI strategic priorities to see alignment analysis.
          </p>
          <Link href="/admin/org-context">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Add strategic priorities
            </Button>
          </Link>
        </div>
      </DashboardCard>
    );
  }

  const overallStyle = alignment.overallAlignment ? OVERALL_ALIGNMENT_STYLES[alignment.overallAlignment as keyof typeof OVERALL_ALIGNMENT_STYLES] : null;
  const govStyle = alignment.governanceReadiness ? GOVERNANCE_STYLES[alignment.governanceReadiness as keyof typeof GOVERNANCE_STYLES] : null;

  return (
    <DashboardCard title="Strategic alignment" subtitle="How well HR capability supports your business AI strategy">
      {overallStyle && (
        <div
          className="p-4 rounded-xl border mb-4"
          style={{ backgroundColor: overallStyle.bg, borderColor: overallStyle.border }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${overallStyle.border}30` }}>
              <Target className="w-4 h-4" style={{ color: overallStyle.border }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: overallStyle.text }}>{overallStyle.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alignment.assessedCount}/{alignment.totalHeadcount} assessed · Function avg: {alignment.functionAvg !== null && alignment.functionAvg !== undefined ? formatPeakonScore(alignment.functionAvg) : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {alignment.priorities.map((p: any) => {
          const style = ALIGNMENT_STYLES[p.alignmentStatus as keyof typeof ALIGNMENT_STYLES] ?? ALIGNMENT_STYLES.unknown;
          return (
            <div key={p.index} className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all">
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-foreground">{p.priority}</p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                    >
                      {style.label}{p.avgRelevantScore !== null ? ` · ${formatPeakonScore(p.avgRelevantScore)}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {p.relevantDomains.map((d: any) => (
                      <span
                        key={d.domain}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                        style={{
                          borderColor: d.colour + "40",
                          backgroundColor: d.colour + "08",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.colour }} />
                        {d.domainName}: <strong className="font-mono">{d.avgScore !== null && d.avgScore !== undefined ? formatPeakonScore(d.avgScore) : "—"}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-neutral-100">
        {govStyle && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: govStyle.bg }}>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Governance</p>
            <p className="text-xs font-semibold" style={{ color: govStyle.text }}>{govStyle.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{govStyle.desc}</p>
          </div>
        )}
        {alignment.hrInfluence && (
          <div className="p-3 rounded-xl bg-neutral-50">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">HR Influence</p>
            <p className="text-xs font-semibold text-foreground capitalize">{alignment.hrInfluence.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {alignment.hrInfluence === "strategic_partner" ? "HR has a seat at the strategy table" :
               alignment.hrInfluence === "operational" ? "HR focuses on operational delivery" :
               "HR is primarily administrative"}
            </p>
          </div>
        )}
        {alignment.aiMaturity && (
          <div className="p-3 rounded-xl bg-neutral-50">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">AI Maturity</p>
            <p className="text-xs font-semibold text-foreground capitalize">{alignment.aiMaturity.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {alignment.aiMaturity === "mature" ? "Advanced AI integration across the business" :
               alignment.aiMaturity === "scaling" ? "Expanding AI use cases beyond pilots" :
               alignment.aiMaturity === "cautious" ? "Careful, measured approach to AI adoption" :
               "Beginning the AI journey"}
            </p>
          </div>
        )}
      </div>

      {alignment.challenges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2">Active Business Challenges</p>
          <div className="space-y-1.5">
            {alignment.challenges.map((c: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-[#99882A] shrink-0" />
                <span className="text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
