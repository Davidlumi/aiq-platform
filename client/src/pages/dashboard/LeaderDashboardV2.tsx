/**
 * Leader Dashboard — AiQ Dashboard Specification v1.1
 *
 * 7 components: Hero Finding, Function Position, Rating Distribution,
 * Domain Distribution, Role-Family Heatmap, Domain Trajectory, Strategic Findings.
 *
 * Department (role-family) filter applied to all queries.
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
  DeltaIndicator,
  CapabilityBar,
} from "@/components/dashboard/DashboardUI";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
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
} from "lucide-react";

const DOMAIN_LABELS: Record<string, string> = {
  ai_interaction: "AI Interaction",
  ai_output_evaluation: "AI Output Evaluation",
  ai_workflow_design: "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust: "AI Ethics & Trust",
  ai_change_leadership: "AI Change Leadership",
};

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

  // Stabilise the query input to avoid infinite re-renders
  const queryInput = useMemo(
    () => (roleFamily ? { roleFamily } : undefined),
    [roleFamily],
  );

  const { data: hero, isLoading: heroLoading } = trpc.dashboardV2.leader.heroFinding.useQuery(queryInput);
  const { data: main, isLoading: mainLoading } = trpc.dashboardV2.leader.main.useQuery(queryInput);
  const { data: trajectory, isLoading: trajLoading } = trpc.dashboardV2.leader.domainTrajectory.useQuery(queryInput);
  const { data: findings, isLoading: findingsLoading } = trpc.dashboardV2.leader.strategicFindings.useQuery(queryInput);
  const { data: teams, isLoading: teamsLoading } = trpc.dashboardV2.leader.teams.useQuery(queryInput);

  const isLoading = heroLoading || mainLoading;

  if (isLoading) return <LeaderDashboardSkeleton />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-xl font-semibold text-foreground">HR Function Overview</h1>
          <p className="text-xs text-muted-foreground mt-1">
            AI capability intelligence across your entire HR function
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Department Filter */}
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
              Your own journey
            </Button>
          </Link>
        </div>
      </header>

      {/* Active filter indicator */}
      {roleFamily && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-foreground">
            Filtered to <strong>{ROLE_FAMILY_OPTIONS.find(o => o.value === roleFamily)?.label ?? roleFamily}</strong>
          </span>
          <button
            onClick={() => setRoleFamily(undefined)}
            className="ml-auto text-xs text-primary hover:underline font-medium"
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

      {/* ── 2. Function Position + 3. Rating Distribution ── */}
      {main && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Function Position */}
          <DashboardCard title="Function position" className="lg:col-span-1">
            <div className="flex flex-col items-center text-center py-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Function Score</p>
              <ScoreDisplay score={main.functionScore} size="lg" className="text-foreground" />
              <div className="mt-3">
                <RatingBadge rating={main.functionRating} size="lg" />
              </div>
              {main.trajectory90d !== null && (
                <div className="mt-3">
                  <DeltaIndicator value={main.trajectory90d} suffix="pts (90d)" />
                </div>
              )}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {main.assessedCount}/{main.totalHeadcount} assessed
                </span>
              </div>
            </div>
          </DashboardCard>

          {/* Rating Distribution */}
          <DashboardCard title="Headcount by readiness" subtitle="Distribution across all assessed employees" className="lg:col-span-2">
            <div className="space-y-3 mt-2">
              {RATING_KEYS.map(key => {
                const count = main.ratingCounts[key] ?? 0;
                const total = main.totalHeadcount || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground w-36 shrink-0">{RATING_LABELS[key]}</span>
                    <div className="flex-1 h-5 rounded bg-neutral-100 overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: RATING_COLOURS[key] }}
                      />
                      {count > 0 && (
                        <span className="absolute inset-y-0 flex items-center text-[10px] font-semibold font-mono tabular-nums" style={{ left: `${Math.min(pct, 90)}%`, paddingLeft: 6, color: pct > 40 ? "#fff" : "#1E293B" }}>
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </div>
      )}

      {/* ── 4. Per-Domain Distribution ── */}
      {main && main.domainDistribution && (
        <DashboardCard title="Domain capability distribution" subtitle="Rating breakdown per capability domain">
          <div className="space-y-3 mt-2">
            {main.domainDistribution.map((dd: any) => {
              const total = dd.totalAssessed || 1;
              return (
                <div key={dd.domain} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-40 shrink-0">
                    <DomainDot domain={dd.domain} />
                    <span className="text-xs font-medium text-foreground truncate">{dd.domainName}</span>
                  </div>
                  <div className="flex-1 h-5 rounded bg-neutral-100 overflow-hidden flex">
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
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-8 text-right shrink-0">
                    {dd.avgScore ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {RATING_KEYS.map(rk => (
              <div key={rk} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RATING_COLOURS[rk] }} />
                <span className="text-[10px] text-muted-foreground">{RATING_LABELS[rk]}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* ── 5. Role-Family Heatmap ── */}
      {main && main.heatmap && (
        <DashboardCard title="Capability heatmap" subtitle="Average score by role family and domain">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground w-40">Role Family</th>
                  {Object.keys(DOMAIN_LABELS).map(dk => (
                    <th key={dk} className="text-center py-2 px-1 font-semibold text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <DomainDot domain={dk} size={6} />
                        <span className="text-[10px] leading-tight whitespace-nowrap">{DOMAIN_LABELS[dk]?.split(" ").slice(0, 2).join(" ")}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {main.heatmap.map((row: any) => (
                  <tr key={row.roleFamily} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{row.roleFamilyName}</td>
                    {row.domains.map((cell: any) => (
                      <td key={cell.domain} className="py-2 px-1 text-center">
                        <HeatmapCell score={cell.avgScore} size="sm" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}

      {/* ── 6. Domain Trajectory ── */}
      {!trajLoading && trajectory && trajectory.domains && (
        <DashboardCard title="Domain trajectory" subtitle="Function-wide average score over time per domain">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {trajectory.domains.map((d: any) => (
              <div key={d.domain} className="p-3 rounded-lg border border-neutral-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DomainDot domain={d.domain} />
                    <span className="text-xs font-semibold text-foreground">{d.domainName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreDisplay score={d.currentValue} size="sm" />
                    {d.delta90d !== null && <DeltaIndicator value={d.delta90d} />}
                  </div>
                </div>
                {d.timeSeries.length >= 2 ? (
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={d.timeSeries} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          stroke={d.colour}
                          strokeWidth={2}
                          dot={{ r: 2, fill: d.colour }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-[10px] text-muted-foreground">
                    Insufficient data for trend
                  </div>
                )}
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* ── 7. Strategic Findings ── */}
      {!findingsLoading && findings && (
        <DashboardCard title="Strategic findings" subtitle="Priority-ordered insights for your function">
          {findings.findings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No strategic findings at this time.</p>
          ) : (
            <div className="space-y-3 mt-1">
              {findings.findings.map((f: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
                >
                  <div className="mt-0.5 shrink-0">
                    <PriorityBadge priority={f.priority} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{f.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                  <Lightbulb className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      )}

      {/* ── Teams Overview ── */}
      {!teamsLoading && teams && teams.teams.length > 0 && (
        <DashboardCard title="Teams" subtitle="Overview of manager teams in your function">
          <div className="space-y-2 mt-1">
            {teams.teams.map((team: any) => (
              <div key={team.managerId} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-600">
                    {team.managerName?.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{team.managerName}</p>
                    <p className="text-[10px] text-muted-foreground">{team.teamSize} members</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {team.avgScore !== null && (
                    <ScoreDisplay score={team.avgScore} size="sm" />
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
  const statusStyles: Record<string, { bg: string; border: string; icon: typeof TrendingUp }> = {
    on_track: { bg: "#ECFDF5", border: "#A7F3D0", icon: TrendingUp },
    at_risk: { bg: "#FEF2F2", border: "#FECACA", icon: AlertTriangle },
    mixed: { bg: "#FFF7ED", border: "#FED7AA", icon: BarChart3 },
    partial: { bg: "#F8FAFC", border: "#CBD5E1", icon: Target },
    not_configured: { bg: "#F8FAFC", border: "#CBD5E1", icon: Target },
  };
  const style = statusStyles[status] ?? statusStyles.not_configured;
  const Icon = style.icon;

  return (
    <div
      className="p-5 rounded-xl border"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${style.border}80` }}>
          <Icon className="w-5 h-5" style={{ color: style.border === "#A7F3D0" ? "#059669" : style.border === "#FECACA" ? "#DC2626" : style.border === "#FED7AA" ? "#D97706" : "#64748B" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground leading-relaxed">{statement}</p>
          <div className="flex items-center gap-4 mt-3">
            {functionScore !== null && (
              <span className="text-xs text-muted-foreground">
                Function score: <strong className="font-mono">{functionScore}</strong>
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
