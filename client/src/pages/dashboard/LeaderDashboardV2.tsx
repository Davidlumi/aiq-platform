/**
 * CPO / Leader Dashboard - Wireframe C1 visual language
 * Dark navy brand theme (AiQ Design System)
 *
 * Hero narrative · 4 KPI tiles · Level distribution donut + legend ·
 * Segment comparison bars · "Worth your attention" insight cards ·
 * Domain distribution table · Teams overview
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { LeaderDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/DashboardUI";
import { getLevelFromScore, getLevelChipStyle, getLevelLabel } from "@/lib/level-utils";
import { Users, UserCircle, ChevronRight, Filter, Target } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_FAMILY_OPTIONS = [
  { value: "business_partnering", label: "Business Partnering" },
  { value: "talent_acquisition", label: "Talent Acquisition" },
  { value: "learning_development", label: "Learning & Development" },
  { value: "reward_analytics", label: "Reward & Analytics" },
  { value: "er_specialists", label: "ER & Specialists" },
  { value: "operations_tech", label: "Operations & Tech" },
  { value: "hr_leadership", label: "HR Leadership" },
];

function KpiTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-md p-5">
      <p className="text-xs font-medium uppercase tracking-widest mb-2 text-muted-foreground">{label}</p>
      <p className="text-3xl font-medium mb-1 text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function LevelDistributionDonut({ distribution, avgScore }: { distribution: Array<{ level: number; count: number; pct: number }>; avgScore: number | null }) {
  const size = 200; const cx = 100; const cy = 100; const r = 72; const sw = 28;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = distribution.map(d => { const arc = (d.pct / 100) * circ; const seg = { level: d.level, arc, offset }; offset += arc; return seg; });
  const preciseAvg = avgScore !== null ? (avgScore / 10).toFixed(1) : "-";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "100%" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(22% 0.030 240)" strokeWidth={sw} />
      {segments.map(seg => { if (seg.arc <= 0) return null; const s = getLevelChipStyle(seg.level); return (<circle key={seg.level} cx={cx} cy={cy} r={r} fill="none" stroke={s.bg} strokeWidth={sw} strokeDasharray={`${seg.arc} ${circ}`} strokeDashoffset={-seg.offset} transform={`rotate(-90 ${cx} ${cy})`} />); })}
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 28, fontWeight: 500, fill: "#F9FAFB", fontFamily: "Sora, system-ui, sans-serif" }}>{preciseAvg}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 10, fill: "#9CA3AF", fontFamily: "Sora, system-ui, sans-serif", letterSpacing: "0.06em" }}>FUNCTION AVG</text>
    </svg>
  );
}

function SegmentBar({ label, score, count, maxScore, isHighlighted }: { label: string; score: number | null; count: number; maxScore: number; isHighlighted?: boolean }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "0.5px solid oklch(22% 0.030 240)" }}>
        <div style={{ width: 160, flexShrink: 0 }}>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{count} people · no data</p>
        </div>
        <div className="flex-1 h-6 rounded" style={{ background: "oklch(22% 0.030 240)" }} />
        <span className="text-sm text-muted-foreground" style={{ width: 36, textAlign: "right" }}>-</span>
      </div>
    );
  }
  const level = getLevelFromScore(score);
  const chipStyle = getLevelChipStyle(level);
  const barWidth = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "0.5px solid oklch(22% 0.030 240)" }}>
      <div style={{ width: 160, flexShrink: 0 }}>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{count} people · Level {(score / 10).toFixed(1)}</p>
      </div>
      <div className="flex-1 relative h-7 rounded overflow-hidden" style={{ background: "oklch(22% 0.030 240)" }}>
        <div className="h-full rounded transition-all duration-700" style={{ width: `${barWidth}%`, background: chipStyle.bg }} />
        {isHighlighted && <div className="absolute inset-0 flex items-center pl-2"><span className="text-xs font-semibold text-foreground">Highest</span></div>}
      </div>
      <span className="text-sm font-medium tabular-nums text-foreground" style={{ width: 36, textAlign: "right" }}>{(score / 10).toFixed(1)}</span>
    </div>
  );
}

export default function LeaderDashboardV2() {
  const [roleFamily, setRoleFamily] = useState<string | undefined>(undefined);
  const queryInput = useMemo(() => (roleFamily ? { roleFamily } : undefined), [roleFamily]);

  const { data: hero, isLoading: heroLoading } = trpc.dashboardV2.leader.heroFinding.useQuery(queryInput);
  const { data: main, isLoading: mainLoading } = trpc.dashboardV2.leader.main.useQuery(queryInput);
  const { data: findings } = trpc.dashboardV2.leader.strategicFindings.useQuery(queryInput);
  const { data: teams } = trpc.dashboardV2.leader.teams.useQuery(queryInput);
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

  const segmentComparison = useMemo(() => {
    if (!teams?.teams || teams.teams.length === 0) return [];
    return [...teams.teams].filter(t => t.avgScore !== null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
  }, [teams]);

  const maxSegmentScore = useMemo(() => Math.max(...segmentComparison.map(s => s.avgScore ?? 0), 100), [segmentComparison]);

  const heroNarrative = useMemo(() => {
    if (!main || !hero) return null;
    const preciseAvg = main.functionScore !== null ? (main.functionScore / 10).toFixed(1) : "-";
    const aiReadyPct = main.assessedCount > 0 ? Math.round(((main.ratingCounts.ai_ready ?? 0) / main.assessedCount) * 100) : 0;
    const atRiskCount = (main.ratingCounts.not_yet_ready ?? 0) + (main.ratingCounts.foundation_gap ?? 0);
    return {
      text: hero.statement ?? `Your function averages Level ${preciseAvg}. ${aiReadyPct}% are AI Ready.${atRiskCount > 0 ? ` ${atRiskCount} employees have a foundation gap or are not yet ready.` : ""}`,
      cta: hero.cta,
    };
  }, [main, hero]);

  const worthAttention = useMemo(() => {
    if (!main) return [];
    const result: Array<{ priority: string; title: string; body: string; linkLabel: string; linkHref: string }> = [];
    const atRiskCount = (main.ratingCounts.not_yet_ready ?? 0) + (main.ratingCounts.foundation_gap ?? 0);
    if (atRiskCount > 0) {
      result.push({ priority: "High priority · function-wide", title: `${atRiskCount} employees have a capability gap that needs urgent attention`, body: `${main.ratingCounts.foundation_gap ?? 0} have a foundation gap and ${main.ratingCounts.not_yet_ready ?? 0} are not yet ready. These employees need targeted development to reach minimum capability threshold.`, linkLabel: "View at-risk employees", linkHref: "/people" });
    }
    const weakestDomain = (main.domainDistribution ?? []).filter((d: any) => d.avgScore !== null).sort((a: any, b: any) => (a.avgScore ?? 0) - (b.avgScore ?? 0))[0];
    if (weakestDomain) {
      result.push({ priority: "Medium priority · domain pattern", title: `${weakestDomain.domainName} is the weakest domain across your function`, body: `Function average ${(weakestDomain.avgScore! / 10).toFixed(1)} in ${weakestDomain.domainName}. ${weakestDomain.totalAssessed} employees assessed. Consider a function-wide learning sprint.`, linkLabel: "View domain breakdown", linkHref: "/admin/org-context" });
    }
    if (ambitionGap?.configured && ambitionGap.gapRaw !== null && ambitionGap.gapRaw > 0) {
      result.push({ priority: "Strategic · ambition gap", title: `Function is ${(ambitionGap.gapRaw / 10).toFixed(1)} levels below your AI ambition target`, body: `Current average ${ambitionGap.functionAvgRaw !== null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "-"} vs target ${ambitionGap.ambitionTargetScore !== null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "-"}.${ambitionGap.ambitionTargetLabel ? ` Goal: "${ambitionGap.ambitionTargetLabel}".` : ""}`, linkLabel: "View strategic roadmap", linkHref: "/dashboard/strategic" });
    }
    if (findings?.findings?.length) {
      const top = findings.findings[0];
      result.push({ priority: `${top.priority} priority · strategic finding`, title: top.observation, body: top.strategicImplication ?? top.supportingData ?? "", linkLabel: "View all strategic findings", linkHref: "/dashboard/strategic" });
    }
    return result.slice(0, 4);
  }, [main, ambitionGap, findings]);

  if (isLoading) return <LeaderDashboardSkeleton />;
  if (!main) return <div className="px-5 py-6 md:px-8 max-w-7xl mx-auto"><EmptyState title="No function data" description="No assessment data available for your function yet." /></div>;

  const aiReadyPct = main.assessedCount > 0 ? Math.round(((main.ratingCounts.ai_ready ?? 0) / main.assessedCount) * 100) : 0;
  const assessedPct = main.totalHeadcount > 0 ? Math.round((main.assessedCount / main.totalHeadcount) * 100) : 0;

  return (
    <div className="px-5 py-6 md:px-8 max-w-6xl mx-auto space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">CPO dashboard</p>
          <h1 className="text-lg font-semibold text-foreground">HR Function Overview</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {main.totalHeadcount} employees · {main.assessedCount} assessed ({assessedPct}%)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={roleFamily ?? "__all__"} onValueChange={(v) => setRoleFamily(v === "__all__" ? undefined : v)}>
              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All departments</SelectItem>
                {ROLE_FAMILY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Link href="/dashboard/personal">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <UserCircle className="w-3.5 h-3.5" />My profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Active filter */}
      {roleFamily && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "oklch(18% 0.040 250)", border: "0.5px solid oklch(30% 0.080 250)" }}>
          <Filter className="w-3.5 h-3.5" style={{ color: "#60A5FA" }} />
          <span className="text-xs" style={{ color: "#93C5FD" }}>
            Filtered to <strong>{ROLE_FAMILY_OPTIONS.find(o => o.value === roleFamily)?.label ?? roleFamily}</strong>
          </span>
          <button onClick={() => setRoleFamily(undefined)} className="ml-auto text-xs font-medium" style={{ color: "#60A5FA" }}>Clear filter</button>
        </div>
      )}

      {/* Hero narrative */}
      {heroNarrative && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-2 text-muted-foreground">Where the function is</p>
          <p className="text-lg font-medium leading-snug mb-4 text-foreground">{heroNarrative.text}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/dashboard/strategic">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">View strategic roadmap</Button>
            </Link>
            {heroNarrative.cta && (
              <Link href={heroNarrative.cta.route}>
                <Button size="sm" variant="outline">{heroNarrative.cta.label}</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 4 KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Function average" value={main.functionScore !== null ? (main.functionScore / 10).toFixed(1) : "-"} sub="Capability level" />
        <KpiTile label="AI Ready" value={`${aiReadyPct}%`} sub={`${main.ratingCounts.ai_ready ?? 0} of ${main.assessedCount} assessed`} />
        <KpiTile label="Foundation gap" value={main.ratingCounts.foundation_gap ?? 0} sub="Need urgent support" />
        <KpiTile label="Assessment coverage" value={`${assessedPct}%`} sub={`${main.assessedCount} of ${main.totalHeadcount} assessed`} />
      </div>

      {/* Level distribution */}
      <div className="bg-card rounded-xl border border-border shadow-md p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-medium text-foreground">Where the function is on the journey</p>
          <Link href="/dashboard/strategic">
            <span className="text-xs text-primary hover:text-primary/80 transition-colors">Strategic view →</span>
          </Link>
        </div>
        <div className="grid gap-8 items-center" style={{ gridTemplateColumns: "200px 1fr" }}>
          <div style={{ position: "relative", width: 200, height: 200 }}>
            <LevelDistributionDonut distribution={levelDistribution} avgScore={main.functionScore} />
          </div>
          <div className="flex flex-col gap-2">
            {[5, 4, 3, 2, 1].map(lv => {
              const d = levelDistribution.find(x => x.level === lv);
              const s = getLevelChipStyle(lv);
              return (
                <div key={lv} className="flex items-center justify-between py-1.5" style={{ borderBottom: lv > 1 ? "0.5px solid oklch(22% 0.030 240)" : undefined }}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium flex-shrink-0" style={{ backgroundColor: s.bg, color: s.text }}>{lv}</span>
                    <span className="text-sm font-medium text-foreground">{getLevelLabel(lv)}</span>
                  </div>
                  <span className="text-sm" style={{ color: (d?.count ?? 0) > 0 ? "#F9FAFB" : "#6B7280" }}>
                    {(d?.count ?? 0) > 0 ? `${d!.count} · ${d!.pct}%` : "0"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Segment comparison bars */}
      {segmentComparison.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-medium text-foreground">Team comparison</p>
            <span className="text-xs text-muted-foreground">Sorted by capability level</span>
          </div>
          {segmentComparison.map((seg, i) => (
            <SegmentBar key={seg.managerId} label={seg.managerName} score={seg.avgScore} count={seg.teamSize} maxScore={maxSegmentScore} isHighlighted={i === 0} />
          ))}
        </div>
      )}

      {/* Domain comparison bars */}
      {main.domainDistribution && main.domainDistribution.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-medium text-foreground">Domain comparison</p>
            <span className="text-xs text-muted-foreground">Sorted by capability level</span>
          </div>
          {[...main.domainDistribution].sort((a: any, b: any) => (b.avgScore ?? 0) - (a.avgScore ?? 0)).map((d: any, i: number) => (
            <SegmentBar key={d.domain} label={d.domainName} score={d.avgScore} count={d.totalAssessed} maxScore={100} isHighlighted={i === 0} />
          ))}
        </div>
      )}

      {/* Worth your attention */}
      {worthAttention.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-1 text-foreground">Worth your attention</p>
          {worthAttention.map((ins, i) => (
            <div key={i} style={{ padding: "14px 0", borderBottom: i < worthAttention.length - 1 ? "0.5px solid oklch(22% 0.030 240)" : undefined }}>
              <p className="text-xs font-medium uppercase tracking-widest mb-1.5 text-primary">{ins.priority}</p>
              <p className="text-sm font-medium mb-1.5 text-foreground">{ins.title}</p>
              <p className="text-xs leading-relaxed mb-2 text-muted-foreground">{ins.body}</p>
              <Link href={ins.linkHref}>
                <span className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">{ins.linkLabel} →</span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Ambition gap banner */}
      {ambitionGap?.configured && ambitionGap.gapRaw !== null && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "oklch(18% 0.040 250)" }}>
              <Target className="w-5 h-5" style={{ color: "#60A5FA" }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-widest mb-1 text-primary">AI ambition gap</p>
              <p className="text-sm font-medium mb-1 text-foreground">
                Current Level {ambitionGap.functionAvgRaw !== null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "-"} vs target Level {ambitionGap.ambitionTargetScore !== null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "-"}
              </p>
              {ambitionGap.ambitionTargetLabel && (
                <p className="text-xs text-muted-foreground">Goal: "{ambitionGap.ambitionTargetLabel}"</p>
              )}
              <Link href="/dashboard/strategic">
                <span className="text-xs font-medium mt-2 inline-block text-primary hover:text-primary/80 transition-colors">View strategic roadmap →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Teams overview */}
      {teams && teams.teams.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">Teams</p>
            <span className="text-xs text-muted-foreground">{teams.teams.length} teams</span>
          </div>
          <div className="space-y-2">
            {teams.teams.map((team: any) => {
              const level = team.avgScore !== null ? getLevelFromScore(team.avgScore) : null;
              const chipStyle = level !== null ? getLevelChipStyle(level) : null;
              return (
                <div key={team.managerId} className="flex items-center justify-between p-3 rounded-xl border border-border" style={{ background: "oklch(17% 0.028 240)" }}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "oklch(22% 0.030 240)", color: "#9CA3AF" }}>
                      {team.managerName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{team.managerName}</p>
                      <p className="text-xs text-muted-foreground">{team.teamSize} people</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {chipStyle && (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium" style={{ backgroundColor: chipStyle.bg, color: chipStyle.text }}>
                        {level}
                      </span>
                    )}
                    {team.avgScore !== null && (
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {(team.avgScore / 10).toFixed(1)}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
