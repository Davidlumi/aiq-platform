/**
 * Leader Dashboard — AiQ Dashboard Specification v1.1
 *
 * 7 components: Hero Finding, Function Position, Rating Distribution,
 * Domain Distribution, Role-Family Heatmap, Domain Trajectory, Strategic Findings.
 *
 * Department (role-family) filter applied to all queries.
 */
import { useState, useMemo, useCallback } from "react";
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
  X,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

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
  const [heatmapDepts, setHeatmapDepts] = useState<Set<string>>(new Set());
  const [heatmapFilterOpen, setHeatmapFilterOpen] = useState(false);

  const toggleHeatmapDept = useCallback((dept: string) => {
    setHeatmapDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }, []);

  const clearHeatmapFilter = useCallback(() => setHeatmapDepts(new Set()), []);
  const selectAllHeatmapDepts = useCallback(() => setHeatmapDepts(new Set(ROLE_FAMILY_OPTIONS.map(o => o.value))), []);

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
  const { data: alignment, isLoading: alignmentLoading } = trpc.dashboardV2.leader.strategicAlignment.useQuery(queryInput);

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
      {main && main.heatmap && (() => {
        const filteredHeatmap = heatmapDepts.size > 0
          ? main.heatmap.filter((row: any) => heatmapDepts.has(row.roleFamily))
          : main.heatmap;
        const activeCount = heatmapDepts.size;
        return (
          <DashboardCard
            title="Capability heatmap"
            subtitle="Average score by role family and domain — colour indicates readiness level"
          >
            {/* Heatmap filter toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Popover open={heatmapFilterOpen} onOpenChange={setHeatmapFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-3">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filter departments
                    {activeCount > 0 && (
                      <span className="ml-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                        {activeCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-0">
                  <div className="p-3 border-b border-neutral-100">
                    <p className="text-xs font-semibold text-foreground">Show departments</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Select which role families to display</p>
                  </div>
                  <div className="p-2 space-y-0.5 max-h-64 overflow-y-auto">
                    {ROLE_FAMILY_OPTIONS.map(opt => {
                      const isChecked = heatmapDepts.has(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-neutral-50 transition-colors text-left"
                          onClick={() => toggleHeatmapDept(opt.value)}
                        >
                          <Checkbox checked={isChecked} tabIndex={-1} className="pointer-events-none" />
                          <span className="text-xs text-foreground">{opt.label}</span>
                          {isChecked && <Check className="w-3 h-3 text-primary ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={selectAllHeatmapDepts}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={clearHeatmapFilter}
                    >
                      Clear all
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Active filter chips */}
              {activeCount > 0 && (
                <>
                  {ROLE_FAMILY_OPTIONS.filter(o => heatmapDepts.has(o.value)).map(opt => (
                    <Badge key={opt.value} variant="secondary" size="sm" className="gap-1 pl-2 pr-1 cursor-pointer hover:bg-neutral-200 transition-colors">
                      {opt.label}
                      <button
                        type="button"
                        className="rounded-full hover:bg-neutral-300 p-0.5 transition-colors"
                        onClick={() => toggleHeatmapDept(opt.value)}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors"
                    onClick={clearHeatmapFilter}
                  >
                    Clear filters
                  </button>
                </>
              )}
              {activeCount === 0 && (
                <span className="text-[10px] text-muted-foreground">Showing all {main.heatmap.length} departments</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 pr-4 font-semibold text-muted-foreground w-44">Role Family</th>
                    {Object.keys(DOMAIN_LABELS).map(dk => (
                      <th key={dk} className="text-center py-3 px-2 font-semibold text-muted-foreground">
                        <div className="flex flex-col items-center gap-1">
                          <DomainDot domain={dk} size={6} />
                          <span className="text-[10px] leading-tight whitespace-nowrap">{DOMAIN_LABELS[dk]?.split(" ").slice(0, 2).join(" ")}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHeatmap.length === 0 ? (
                    <tr>
                      <td colSpan={Object.keys(DOMAIN_LABELS).length + 1} className="py-8 text-center text-xs text-muted-foreground">
                        No departments match the current filter. Try selecting different departments.
                      </td>
                    </tr>
                  ) : (
                    filteredHeatmap.map((row: any) => (
                      <tr key={row.roleFamily} className="border-b border-neutral-100 last:border-0">
                        <td className="py-3 pr-4 font-medium text-foreground">{row.roleFamilyName}</td>
                        {row.domains.map((cell: any) => (
                          <td key={cell.domain} className="py-3 px-2 text-center">
                            <HeatmapCell score={cell.avgScore} headcount={cell.headcount} target={cell.target} size="sm" />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary row when filtered */}
            {activeCount > 0 && filteredHeatmap.length > 0 && (
              <div className="mt-2 px-1">
                <p className="text-[10px] text-muted-foreground">
                  Showing {filteredHeatmap.length} of {main.heatmap.length} departments
                </p>
              </div>
            )}

            {/* Heatmap colour legend */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-neutral-100 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium">Readiness:</span>
              {[
                { label: "AI Ready", bg: "#ECFDF5", ring: "#10B981" },
                { label: "Strong Dev.", bg: "#F0FDF4", ring: "#4ADE80" },
                { label: "Developing", bg: "#FFFBEB", ring: "#F59E0B" },
                { label: "Weak Dev.", bg: "#FFF7ED", ring: "#F97316" },
                { label: "Not Ready", bg: "#FEF2F2", ring: "#EF4444" },
                { label: "Foundation Gap", bg: "#FEF2F2", ring: "#DC2626" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.bg, borderLeft: `2px solid ${l.ring}` }} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground ml-2">— = No data</span>
            </div>
          </DashboardCard>
        );
      })()}

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

      {/* ── 6b. Strategic Alignment ── */}
      {!alignmentLoading && alignment && (
        <StrategicAlignmentSection alignment={alignment} />
      )}

      {/* ── 7. Strategic Findings ── */}
      {!findingsLoading && findings && (
        <DashboardCard title="Strategic findings" subtitle="Priority-ordered insights for your function">
          {findings.findings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No strategic findings at this time. Findings are generated once assessment data is available.</p>
          ) : (
            <div className="space-y-3 mt-1">
              {findings.findings.map((f: any, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    <div className="mt-0.5 shrink-0">
                      <PriorityBadge priority={f.priority} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{f.observation}</p>
                      {f.supportingData && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 font-mono bg-neutral-50 rounded px-2 py-1 inline-block">
                          {f.supportingData}
                        </p>
                      )}
                    </div>
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  </div>
                  {f.strategicImplication && (
                    <div className="px-3 pb-3 pt-0 ml-9">
                      <div className="text-[11px] text-muted-foreground leading-relaxed bg-blue-50/50 border border-blue-100 rounded-md px-3 py-2">
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

// ─── Strategic Alignment Section ────────────────────────────────────────────

const ALIGNMENT_STYLES = {
  aligned: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", label: "Aligned", icon: "✓" },
  partial: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", label: "Partial", icon: "◐" },
  gap: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", label: "Gap", icon: "✗" },
  unknown: { bg: "#F1F5F9", border: "#CBD5E1", text: "#475569", label: "Unknown", icon: "?" },
};

const OVERALL_ALIGNMENT_STYLES = {
  aligned: { bg: "#ECFDF5", border: "#10B981", text: "#065F46", label: "HR capability is aligned with business strategy" },
  partial: { bg: "#FFFBEB", border: "#F59E0B", text: "#92400E", label: "Partial alignment — some strategic priorities have capability gaps" },
  misaligned: { bg: "#FEF2F2", border: "#EF4444", text: "#991B1B", label: "Significant misalignment — HR capability does not support business strategy" },
};

const GOVERNANCE_STYLES = {
  strong: { bg: "#ECFDF5", text: "#065F46", label: "Strong", desc: "Governance framework, ethics committee, and policies in place" },
  developing: { bg: "#FFFBEB", text: "#92400E", label: "Developing", desc: "Some governance structures exist but gaps remain" },
  weak: { bg: "#FEF2F2", text: "#991B1B", label: "Weak", desc: "Limited governance infrastructure for AI oversight" },
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
            Add your AI strategic priorities to see alignment analysis. This shows whether your HR function has the capability to support each business objective.
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
      {/* Overall alignment signal */}
      {overallStyle && (
        <div
          className="p-4 rounded-lg border mb-4"
          style={{ backgroundColor: overallStyle.bg, borderColor: overallStyle.border }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${overallStyle.border}30` }}>
              <Target className="w-4 h-4" style={{ color: overallStyle.border }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: overallStyle.text }}>{overallStyle.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alignment.assessedCount}/{alignment.totalHeadcount} assessed · Function avg: {alignment.functionAvg ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Priority-by-priority alignment */}
      <div className="space-y-3">
        {alignment.priorities.map((p: any) => {
          const style = ALIGNMENT_STYLES[p.alignmentStatus as keyof typeof ALIGNMENT_STYLES] ?? ALIGNMENT_STYLES.unknown;
          return (
            <div key={p.index} className="p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all">
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
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                    >
                      {style.label}{p.avgRelevantScore !== null ? ` · ${p.avgRelevantScore}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {p.relevantDomains.map((d: any) => (
                      <span
                        key={d.domain}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border"
                        style={{
                          borderColor: d.colour + "40",
                          backgroundColor: d.colour + "08",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.colour }} />
                        {d.domainName}: <strong className="font-mono">{d.avgScore ?? "—"}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Governance & context signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-neutral-100">
        {/* Governance readiness */}
        {govStyle && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: govStyle.bg }}>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Governance</p>
            <p className="text-xs font-semibold" style={{ color: govStyle.text }}>{govStyle.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{govStyle.desc}</p>
          </div>
        )}

        {/* HR Influence */}
        {alignment.hrInfluence && (
          <div className="p-3 rounded-lg bg-neutral-50">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">HR Influence</p>
            <p className="text-xs font-semibold text-foreground capitalize">{alignment.hrInfluence.replace(/_/g, " ")}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {alignment.hrInfluence === "strategic_partner" ? "HR has a seat at the strategy table" :
               alignment.hrInfluence === "operational" ? "HR focuses on operational delivery" :
               "HR is primarily administrative"}
            </p>
          </div>
        )}

        {/* AI Maturity */}
        {alignment.aiMaturity && (
          <div className="p-3 rounded-lg bg-neutral-50">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">AI Maturity</p>
            <p className="text-xs font-semibold text-foreground capitalize">{alignment.aiMaturity.replace(/_/g, " ")}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {alignment.aiMaturity === "mature" ? "Advanced AI integration across the business" :
               alignment.aiMaturity === "scaling" ? "Expanding AI use cases beyond pilots" :
               alignment.aiMaturity === "cautious" ? "Careful, measured approach to AI adoption" :
               "Beginning the AI journey"}
            </p>
          </div>
        )}
      </div>

      {/* Current challenges */}
      {alignment.challenges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Active Business Challenges</p>
          <div className="space-y-1.5">
            {alignment.challenges.map((c: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
