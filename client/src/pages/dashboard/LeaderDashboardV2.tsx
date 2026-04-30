/**
 * CPO / Leader Dashboard — redesigned for consistency with the AiQ design system.
 * Clean card-based layout, consistent border/card/foreground tokens, team × domain heatmap.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { LeaderDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/DashboardUI";
import { getLevelFromScore, getLevelChipStyle, getLevelLabel } from "@/lib/level-utils";
import { Users, UserCircle, Filter, Target, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_FAMILY_OPTIONS = [
  { value: "business_partnering",  label: "Business Partnering" },
  { value: "talent_acquisition",   label: "Talent Acquisition" },
  { value: "learning_development", label: "Learning & Development" },
  { value: "reward_analytics",     label: "Reward & Analytics" },
  { value: "er_specialists",       label: "ER & Specialists" },
  { value: "operations_tech",      label: "Operations & Tech" },
  { value: "hr_leadership",        label: "HR Leadership" },
];

const DOMAIN_COLOURS: Record<string, string> = {
  ai_interaction:         "#3B82F6",
  ai_output_evaluation:   "#8B5CF6",
  ai_workflow_design:     "#10B981",
  workforce_ai_readiness: "#F59E0B",
  ai_ethics_trust:        "#EF4444",
  ai_change_leadership:   "#06B6D4",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold text-foreground" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// Heatmap-aligned colours for each readiness level (5 → 1)
const LEVEL_DONUT_COLOURS: Record<number, { fill: string; text: string }> = {
  5: { fill: "#22c55e", text: "#86efac" },   // AI Ready — green
  4: { fill: "#10b981", text: "#6ee7b7" },   // Strong — teal
  3: { fill: "#f59e0b", text: "#fde68a" },   // Capable — amber
  2: { fill: "#f97316", text: "#fdba74" },   // Developing — orange
  1: { fill: "#ef4444", text: "#fca5a5" },   // Emerging/Gap — red
};

function ReadinessDonut({ distribution }: { distribution: Array<{ level: number; count: number; pct: number }> }) {
  const R = 54; // outer radius
  const r = 34; // inner radius
  const cx = 70; const cy = 70;
  const total = distribution.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  // Build arc paths
  let cumAngle = -Math.PI / 2; // start at top
  const slices = distribution
    .filter(d => d.count > 0)
    .map(d => {
      const angle = (d.count / total) * 2 * Math.PI;
      const startAngle = cumAngle;
      cumAngle += angle;
      const endAngle = cumAngle;
      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const ix1 = cx + r * Math.cos(endAngle);
      const iy1 = cy + r * Math.sin(endAngle);
      const ix2 = cx + r * Math.cos(startAngle);
      const iy2 = cy + r * Math.sin(startAngle);
      const large = angle > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`;
      return { ...d, path, colour: LEVEL_DONUT_COLOURS[d.level]?.fill ?? "#6b7280" };
    });

  return (
    <div className="flex items-center gap-6">
      {/* Donut SVG */}
      <div className="flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {slices.map(s => (
            <path key={s.level} d={s.path} fill={s.colour} opacity={0.9} />
          ))}
          {/* Centre label */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground" fontSize="18" fontWeight="700">{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="10">assessed</text>
        </svg>
      </div>
      {/* Legend */}
      <div className="flex-1 space-y-2">
        {[5, 4, 3, 2, 1].map(lv => {
          const d = distribution.find(x => x.level === lv);
          const count = d?.count ?? 0;
          const pct = d?.pct ?? 0;
          const col = LEVEL_DONUT_COLOURS[lv];
          return (
            <div key={lv} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.fill }} />
              <span className="text-xs text-foreground flex-1">{getLevelLabel(lv)}</span>
              <span className="text-xs tabular-nums font-semibold" style={{ color: count > 0 ? col.fill : "var(--muted-foreground)" }}>
                {count > 0 ? `${pct}%` : "0%"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DomainBar({ label, score, count, colour }: { label: string; score: number | null; count: number; colour: string }) {
  const pct = score != null ? Math.round(score / 10) * 10 : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="w-40 flex-shrink-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{count} assessed</p>
      </div>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: colour }} />
      </div>
      <span className="text-sm font-semibold tabular-nums w-8 text-right" style={{ color: score != null ? colour : "var(--muted-foreground)" }}>
        {score != null ? (score / 10).toFixed(1) : "—"}
      </span>
    </div>
  );
}

// ─── Team × Domain Heatmap ────────────────────────────────────────────────────

function heatmapCellStyle(score: number | null): { bg: string; text: string } {
  if (score == null) return { bg: "var(--muted)", text: "var(--muted-foreground)" };
  const s = score / 10; // 0–10
  if (s >= 7.5) return { bg: "#14532d", text: "#86efac" };
  if (s >= 6.0) return { bg: "#166534", text: "#bbf7d0" };
  if (s >= 5.0) return { bg: "#713f12", text: "#fde68a" };
  if (s >= 3.5) return { bg: "#7c2d12", text: "#fdba74" };
  return { bg: "#450a0a", text: "#fca5a5" };
}

function TeamDomainHeatmap({
  teams, domains,
}: {
  teams: Array<{ managerId: string; managerName: string; teamSize: number; domainScores: Record<string, number | null>; overallAvg: number | null }>;
  domains: Array<{ key: string; label: string }>;
}) {
  if (teams.length === 0) return null;
  // Abbreviate domain labels to 2-word max for column headers
  const abbr = (label: string) => {
    const words = label.replace("AI ", "").split(" ");
    return words.length > 2 ? words.slice(0, 2).join(" ") : label.replace("AI ", "");
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 pr-3 text-muted-foreground font-semibold uppercase tracking-widest text-xs w-36 sticky left-0 bg-card">Team</th>
            {domains.map(d => (
              <th key={d.key} className="text-center py-2 px-1 font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap min-w-[72px]">
                <span className="block" style={{ color: DOMAIN_COLOURS[d.key] ?? "var(--foreground)" }}>{abbr(d.label)}</span>
              </th>
            ))}
            <th className="text-center py-2 px-1 font-semibold text-muted-foreground uppercase tracking-widest min-w-[56px]">Overall</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr key={team.managerId} className="border-t border-border">
              <td className="py-2 pr-3 sticky left-0 bg-card">
                <p className="font-medium text-foreground truncate max-w-[128px]">{team.managerName}</p>
                <p className="text-muted-foreground">{team.teamSize} people</p>
              </td>
              {domains.map(d => {
                const score = team.domainScores[d.key] ?? null;
                const cell = heatmapCellStyle(score);
                return (
                  <td key={d.key} className="py-1.5 px-1 text-center">
                    <span
                      className="inline-flex items-center justify-center w-14 h-7 rounded-md text-xs font-semibold tabular-nums"
                      style={{ background: cell.bg, color: cell.text }}
                    >
                      {score != null ? (score / 10).toFixed(1) : "—"}
                    </span>
                  </td>
                );
              })}
              <td className="py-1.5 px-1 text-center">
                {(() => {
                  const cell = heatmapCellStyle(team.overallAvg);
                  return (
                    <span className="inline-flex items-center justify-center w-14 h-7 rounded-md text-xs font-bold tabular-nums" style={{ background: cell.bg, color: cell.text }}>
                      {team.overallAvg != null ? (team.overallAvg / 10).toFixed(1) : "—"}
                    </span>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Score key</span>
        {[
          { label: "≥7.5 AI Ready",   bg: "#14532d", text: "#86efac" },
          { label: "6.0–7.4 Strong",  bg: "#166534", text: "#bbf7d0" },
          { label: "5.0–5.9 Capable", bg: "#713f12", text: "#fde68a" },
          { label: "3.5–4.9 Dev",     bg: "#7c2d12", text: "#fdba74" },
          { label: "<3.5 Gap",        bg: "#450a0a", text: "#fca5a5" },
        ].map(l => (
          <span key={l.label} className="inline-flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.bg }} />
            <span style={{ color: l.text }}>{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaderDashboardV2() {
  const [roleFamily, setRoleFamily] = useState<string | undefined>(undefined);
  const queryInput = useMemo(() => (roleFamily ? { roleFamily } : undefined), [roleFamily]);

  const { data: hero, isLoading: heroLoading } = trpc.dashboardV2.leader.heroFinding.useQuery(queryInput);
  const { data: main, isLoading: mainLoading } = trpc.dashboardV2.leader.main.useQuery(queryInput);
  const { data: findings } = trpc.dashboardV2.leader.strategicFindings.useQuery(queryInput);
  const { data: heatmapData } = trpc.dashboardV2.leader.teamsHeatmap.useQuery(queryInput);
  const { data: ambitionGap } = trpc.dashboardV2.leader.ambitionGap.useQuery(queryInput);

  const isLoading = heroLoading || mainLoading;

  const levelDistribution = useMemo(() => {
    if (!main) return [];
    const total = main.assessedCount || 1;
    const level5 = main.ratingCounts.ai_ready ?? 0;
    const level3 = main.ratingCounts.developing ?? 0;
    const level2 = main.ratingCounts.not_yet_ready ?? 0;
    const level1 = main.ratingCounts.foundation_gap ?? 0;
    const level4 = Math.max(0, total - level5 - level3 - level2 - level1);
    return [
      { level: 5, count: level5, pct: Math.round((level5 / total) * 100) },
      { level: 4, count: level4, pct: Math.round((level4 / total) * 100) },
      { level: 3, count: level3, pct: Math.round((level3 / total) * 100) },
      { level: 2, count: level2, pct: Math.round((level2 / total) * 100) },
      { level: 1, count: level1, pct: Math.round((level1 / total) * 100) },
    ];
  }, [main]);

  const heroNarrative = useMemo(() => {
    if (!main || !hero) return null;
    const preciseAvg = main.functionScore !== null ? (main.functionScore / 10).toFixed(1) : "-";
    const aiReadyPct = main.assessedCount > 0 ? Math.round(((main.ratingCounts.ai_ready ?? 0) / main.assessedCount) * 100) : 0;
    const atRiskCount = (main.ratingCounts.not_yet_ready ?? 0) + (main.ratingCounts.foundation_gap ?? 0);
    return {
      text: hero.statement ?? `Your function averages ${preciseAvg}. ${aiReadyPct}% are AI Ready.${atRiskCount > 0 ? ` ${atRiskCount} employees need urgent support.` : ""}`,
      cta: hero.cta,
    };
  }, [main, hero]);

  const worthAttention = useMemo(() => {
    if (!main) return [];
    const result: Array<{ priority: string; title: string; body: string; linkLabel: string; linkHref: string; type: "high" | "medium" | "strategic" }> = [];
    const atRiskCount = (main.ratingCounts.not_yet_ready ?? 0) + (main.ratingCounts.foundation_gap ?? 0);
    if (atRiskCount > 0) {
      result.push({ type: "high", priority: "High priority", title: `${atRiskCount} employees have a capability gap`, body: `${main.ratingCounts.foundation_gap ?? 0} foundation gap · ${main.ratingCounts.not_yet_ready ?? 0} not yet ready.`, linkLabel: "View employees", linkHref: "/people" });
    }
    const weakestDomain = (main.domainDistribution ?? []).filter((d: any) => d.avgScore !== null).sort((a: any, b: any) => (a.avgScore ?? 0) - (b.avgScore ?? 0))[0];
    if (weakestDomain) {
      result.push({ type: "medium", priority: "Domain gap", title: `${weakestDomain.domainName} is the weakest domain`, body: `Function average ${(weakestDomain.avgScore! / 10).toFixed(1)} · ${weakestDomain.totalAssessed} assessed.`, linkLabel: "View breakdown", linkHref: "/admin/org-context" });
    }
    if (ambitionGap?.configured && ambitionGap.gapRaw !== null && ambitionGap.gapRaw > 0) {
      result.push({ type: "strategic", priority: "Ambition gap", title: `Function is ${(ambitionGap.gapRaw / 10).toFixed(1)} below AI ambition target`, body: `Current ${ambitionGap.functionAvgRaw !== null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "-"} vs target ${ambitionGap.ambitionTargetScore !== null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "-"}.`, linkLabel: "View roadmap", linkHref: "/dashboard/strategic" });
    }
    return result.slice(0, 3);
  }, [main, ambitionGap]);

  if (isLoading) return <LeaderDashboardSkeleton />;
  if (!main) return (
    <div className="px-5 py-6 md:px-8 max-w-7xl mx-auto">
      <EmptyState title="No function data" description="No assessment data available for your function yet." />
    </div>
  );

  const aiReadyPct = main.assessedCount > 0 ? Math.round(((main.ratingCounts.ai_ready ?? 0) / main.assessedCount) * 100) : 0;
  const assessedPct = main.totalHeadcount > 0 ? Math.round((main.assessedCount / main.totalHeadcount) * 100) : 0;
  const atRiskCount = (main.ratingCounts.not_yet_ready ?? 0) + (main.ratingCounts.foundation_gap ?? 0);

  return (
    <div className="px-5 py-6 md:px-8 max-w-6xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">CPO Dashboard</p>
          <h1 className="text-xl font-bold text-foreground">HR Function Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Users className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {main.totalHeadcount} employees · {main.assessedCount} assessed ({assessedPct}%)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={roleFamily ?? "__all__"} onValueChange={(v) => setRoleFamily(v === "__all__" ? undefined : v)}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All departments</SelectItem>
              {ROLE_FAMILY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Link href="/dashboard/personal">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <UserCircle className="w-3.5 h-3.5" />My profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Active filter chip */}
      {roleFamily && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-foreground">
            Filtered to <strong>{ROLE_FAMILY_OPTIONS.find(o => o.value === roleFamily)?.label ?? roleFamily}</strong>
          </span>
          <button onClick={() => setRoleFamily(undefined)} className="ml-auto text-xs font-semibold text-primary hover:text-primary/80">Clear</button>
        </div>
      )}

      {/* ── Hero narrative ── */}
      {heroNarrative && (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Function snapshot</p>
          <p className="text-base font-medium text-foreground leading-relaxed mb-4">{heroNarrative.text}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/dashboard/strategic">
              <Button size="sm">View strategic roadmap</Button>
            </Link>
            {heroNarrative.cta && (
              <Link href={heroNarrative.cta.route}>
                <Button size="sm" variant="outline">{heroNarrative.cta.label}</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── 4 KPI tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Function average" value={main.functionScore !== null ? (main.functionScore / 10).toFixed(1) : "—"} sub="Capability level" />
        <KpiCard label="AI Ready" value={`${aiReadyPct}%`} sub={`${main.ratingCounts.ai_ready ?? 0} of ${main.assessedCount}`} accent="#22c55e" />
        <KpiCard label="Capability gaps" value={atRiskCount} sub="Need urgent support" accent={atRiskCount > 0 ? "#ef4444" : undefined} />
        <KpiCard label="Assessment coverage" value={`${assessedPct}%`} sub={`${main.assessedCount} of ${main.totalHeadcount}`} />
      </div>

      {/* ── Two-column: Level distribution + Domain breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Level distribution */}
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Readiness distribution</p>
          <ReadinessDonut distribution={levelDistribution} />
          <Link href="/dashboard/strategic">
            <span className="text-xs font-semibold text-primary hover:text-primary/80 mt-4 inline-block">Strategic view →</span>
          </Link>
        </div>

        {/* Domain breakdown */}
        {main.domainDistribution && main.domainDistribution.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Domain breakdown</p>
            <div>
              {[...main.domainDistribution]
                .sort((a: any, b: any) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
                .map((d: any) => (
                  <DomainBar
                    key={d.domain}
                    label={d.domainName}
                    score={d.avgScore}
                    count={d.totalAssessed}
                    colour={DOMAIN_COLOURS[d.domain] ?? "var(--primary)"}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Team × Domain Heatmap ── */}
      {heatmapData && heatmapData.teams.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Team capability heatmap</p>
              <p className="text-xs text-muted-foreground mt-0.5">Average score per team across all six domains</p>
            </div>
            <Badge variant="outline" className="text-xs">{heatmapData.teams.length} teams</Badge>
          </div>
          <TeamDomainHeatmap teams={heatmapData.teams} domains={heatmapData.domains} />
        </div>
      )}

      {/* ── Worth your attention ── */}
      {worthAttention.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Worth your attention</p>
          <div className="space-y-4">
            {worthAttention.map((ins, i) => {
              const iconColour = ins.type === "high" ? "#ef4444" : ins.type === "medium" ? "#f59e0b" : "var(--primary)";
              const Icon = ins.type === "high" ? AlertTriangle : ins.type === "strategic" ? Target : TrendingUp;
              return (
                <div key={i} className={cn("flex items-start gap-3 pb-4", i < worthAttention.length - 1 && "border-b border-border")}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${iconColour}18` }}>
                    <Icon className="w-4 h-4" style={{ color: iconColour }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: iconColour }}>{ins.priority}</p>
                    <p className="text-sm font-medium text-foreground mb-0.5">{ins.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{ins.body}</p>
                    <Link href={ins.linkHref}>
                      <span className="text-xs font-semibold text-primary hover:text-primary/80">{ins.linkLabel} →</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ambition gap ── */}
      {ambitionGap?.configured && ambitionGap.gapRaw !== null && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">AI ambition gap</p>
              <p className="text-sm font-medium text-foreground mb-0.5">
                Current {ambitionGap.functionAvgRaw !== null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "—"} vs target {ambitionGap.ambitionTargetScore !== null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—"}
              </p>
              {ambitionGap.ambitionTargetLabel && (
                <p className="text-xs text-muted-foreground">Goal: "{ambitionGap.ambitionTargetLabel}"</p>
              )}
              <Link href="/dashboard/strategic">
                <span className="text-xs font-semibold text-primary hover:text-primary/80 mt-2 inline-block">View strategic roadmap →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
