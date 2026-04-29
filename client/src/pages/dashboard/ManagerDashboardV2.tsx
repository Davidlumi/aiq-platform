/**
 * Manager Dashboard - Wireframe M1 visual language
 * Dark navy brand theme (AiQ Design System)
 *
 * Hero narrative · 4 KPI tiles · Level distribution donut + legend ·
 * "Worth investigating" insight cards · Capability heatmap · Dev overview
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ManagerDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/DashboardUI";
import { getLevelFromScore, getLevelChipStyle, getLevelLabel } from "@/lib/level-utils";
import { DOMAIN_KEYS, DOMAIN_LABELS } from "@/lib/domains";
import { Users, CalendarDays, UserCircle, ChevronRight, MessageSquareText, TrendingUp, AlertTriangle } from "lucide-react";

function KpiTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-md p-5">
      <p className="text-xs font-medium uppercase tracking-widest mb-2 text-muted-foreground">{label}</p>
      <p className="text-3xl font-medium mb-1 text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function LevelDistributionDonut({
  distribution,
  avgScore,
}: {
  distribution: Array<{ level: number; count: number; pct: number }>;
  avgScore: number | null;
}) {
  const size = 200; const cx = 100; const cy = 100; const r = 72; const sw = 28;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = distribution.map(d => {
    const arc = (d.pct / 100) * circ;
    const seg = { level: d.level, arc, offset };
    offset += arc;
    return seg;
  });
  const preciseAvg = avgScore !== null ? (avgScore / 10).toFixed(1) : "-";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="aiq-chart-mount" style={{ width: "100%", height: "100%" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(22% 0.030 240)" strokeWidth={sw} />
      {segments.map(seg => {
        if (seg.arc <= 0) return null;
        const s = getLevelChipStyle(seg.level);
        return (<circle key={seg.level} cx={cx} cy={cy} r={r} fill="none" stroke={s.bg} strokeWidth={sw} strokeDasharray={`${seg.arc} ${circ}`} strokeDashoffset={-seg.offset} transform={`rotate(-90 ${cx} ${cy})`} />);
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 28, fontWeight: 500, fill: "#F9FAFB", fontFamily: "Sora, system-ui, sans-serif" }}>{preciseAvg}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 10, fill: "#9CA3AF", fontFamily: "Sora, system-ui, sans-serif", letterSpacing: "0.06em" }}>TEAM AVG</text>
    </svg>
  );
}

function HeatCell({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="rounded flex items-center justify-center" style={{ padding: "10px 4px", background: "oklch(17% 0.028 240)", border: "0.5px dashed oklch(22% 0.030 240)" }}>
        <span className="text-xs text-muted-foreground">-</span>
      </div>
    );
  }
  const level = getLevelFromScore(score);
  const s = getLevelChipStyle(level);
  return (
    <div className="rounded flex items-center justify-center" style={{ padding: "10px 4px", background: s.bg }}>
      <span className="text-sm font-medium" style={{ color: s.text }}>{(score / 10).toFixed(1)}</span>
    </div>
  );
}

export default function ManagerDashboardV2() {
  const [promptsExpanded, setPromptsExpanded] = useState(false);

  const { data, isLoading } = trpc.dashboardV2.manager.main.useQuery();
  const { data: prompts, isLoading: promptsLoading } = trpc.dashboardV2.manager.conversationPrompts.useQuery();
  const { data: devOverview } = trpc.dashboardV2.manager.developmentOverview.useQuery();

  const teamAvgScore = useMemo(() => {
    const scored = (data?.heatmapData ?? []).filter(m => m.overallScore != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, m) => sum + (m.overallScore ?? 0), 0) / scored.length);
  }, [data?.heatmapData]);

  const levelDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const scored = (data?.heatmapData ?? []).filter(m => m.overallScore != null);
    scored.forEach(m => {
      const lv = getLevelFromScore(m.overallScore!);
      counts[lv] = (counts[lv] ?? 0) + 1;
    });
    const total = scored.length || 1;
    return [1, 2, 3, 4, 5].map(lv => ({ level: lv, count: counts[lv], pct: Math.round((counts[lv] / total) * 100) }));
  }, [data?.heatmapData]);

  const heroNarrative = useMemo(() => {
    if (!data || !teamAvgScore) return null;
    const preciseAvg = (teamAvgScore / 10).toFixed(1);
    const atLevel3Plus = (data.heatmapData ?? []).filter(m => m.overallScore != null && getLevelFromScore(m.overallScore) >= 3).length;
    const scored = (data.heatmapData ?? []).filter(m => m.overallScore != null).sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0));
    const lowestMember = scored[0];
    return {
      text: `Your team averages capability Level ${preciseAvg}. ${atLevel3Plus} of ${data.teamSize} are at Level 3 or above.${lowestMember ? ` ${lowestMember.name} has the largest development gap - Level ${(lowestMember.overallScore! / 10).toFixed(1)}.` : ""}`,
      lowestMember: lowestMember ? { id: lowestMember.id, name: lowestMember.name } : null,
    };
  }, [data, teamAvgScore]);

  const insights = useMemo(() => {
    if (!data || !teamAvgScore) return [];
    const result: Array<{ priority: string; title: string; body: string; linkLabel: string; linkHref: string }> = [];
    const scored = (data.heatmapData ?? []).filter(m => m.overallScore != null).sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0));
    const lowestMember = scored[0];
    if (lowestMember) {
      result.push({
        priority: "High priority · individual",
        title: `${lowestMember.name} has the largest development gap on your team`,
        body: `Level ${(lowestMember.overallScore! / 10).toFixed(1)}. ${data.ratingCounts.foundation_gap > 0 ? "Foundation work needed." : "Development plan recommended."}${devOverview ? ` ${devOverview.aggregateCompletionRate}% average team completion.` : ""}`,
        linkLabel: `Review ${lowestMember.name.split(" ")[0]}'s development`,
        linkHref: `/people/${lowestMember.id}`,
      });
    }
    const domainAvgs: Record<string, number[]> = {};
    (data.heatmapData ?? []).forEach(m => {
      DOMAIN_KEYS.forEach(k => {
        const s = m.domainScores[k as keyof typeof m.domainScores];
        if (s != null) { if (!domainAvgs[k]) domainAvgs[k] = []; domainAvgs[k].push(s); }
      });
    });
    const domainMeans = DOMAIN_KEYS.map(k => ({
      key: k,
      avg: domainAvgs[k]?.length ? domainAvgs[k].reduce((a, b) => a + b, 0) / domainAvgs[k].length : 0,
    })).filter(d => d.avg > 0).sort((a, b) => a.avg - b.avg);
    if (domainMeans.length >= 2) {
      const weakest = domainMeans[0];
      const strongest = domainMeans[domainMeans.length - 1];
      const weakLabel = DOMAIN_LABELS[weakest.key as keyof typeof DOMAIN_LABELS];
      const strongLabel = DOMAIN_LABELS[strongest.key as keyof typeof DOMAIN_LABELS];
      const benefitCount = (data.heatmapData ?? []).filter(m => {
        const s = m.domainScores[weakest.key as keyof typeof m.domainScores];
        return s != null && getLevelFromScore(s) < 3;
      }).length;
      result.push({
        priority: "Medium priority · team pattern",
        title: `${weakLabel} is your team's weakest domain`,
        body: `Team averages ${(weakest.avg / 10).toFixed(1)} in ${weakLabel} vs ${(strongest.avg / 10).toFixed(1)} in ${strongLabel}. ${benefitCount} of ${data.teamSize} would benefit from focused development.`,
        linkLabel: "View team development options",
        linkHref: "/manager/team-learning",
      });
    }
    const topMember = scored[scored.length - 1];
    if (topMember && getLevelFromScore(topMember.overallScore!) >= 4) {
      result.push({
        priority: "Recognition · individual",
        title: `${topMember.name} is now AI Ready in their role`,
        body: `Level ${(topMember.overallScore! / 10).toFixed(1)}. Worth recognising and considering for stretch assignments.`,
        linkLabel: "View their profile",
        linkHref: `/people/${topMember.id}`,
      });
    }
    return result;
  }, [data, teamAvgScore, devOverview]);

  if (isLoading) return <ManagerDashboardSkeleton />;
  if (!data) return (
    <div className="px-5 py-6 md:px-8 max-w-7xl mx-auto">
      <EmptyState title="No team data" description="You don't have any team members assigned yet." />
    </div>
  );

  const aiReadyCount = data.ratingCounts.ai_ready ?? 0;
  const devActiveCount = (data.ratingCounts.developing ?? 0) + (data.ratingCounts.ai_ready ?? 0);

  return (
    <div className="px-5 py-6 md:px-8 max-w-6xl mx-auto space-y-5">

      {/* -- Page header -- */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Manager dashboard</p>
          <h1 className="text-lg font-semibold text-foreground">{data.manager.teamName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {data.teamSize} team member{data.teamSize !== 1 ? "s" : ""}
            </span>
            {data.lastTeamActivity && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                Last activity {new Date(data.lastTeamActivity).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/manager/team-learning">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">Team development plans</Button>
          </Link>
          <Link href="/dashboard/personal">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <UserCircle className="w-3.5 h-3.5" />My profile
            </Button>
          </Link>
        </div>
      </div>

      {/* -- Hero narrative -- */}
      {heroNarrative && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-2 text-muted-foreground">Where the team is</p>
          <p className="text-lg font-medium leading-snug mb-4 text-foreground">{heroNarrative.text}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/manager/team-learning">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">View team development plans</Button>
            </Link>
            {heroNarrative.lowestMember && (
              <Link href="/people">
                <Button size="sm" variant="outline">View all team members</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* -- 4 KPI tiles -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Team average" value={teamAvgScore !== null ? (teamAvgScore / 10).toFixed(1) : "-"} sub="Capability level" />
        <KpiTile
          label="Vs function"
          value={teamAvgScore !== null ? (teamAvgScore >= 24 ? `+${((teamAvgScore - 24) / 10).toFixed(1)}` : ((teamAvgScore - 24) / 10).toFixed(1)) : "-"}
          sub="Function avg 2.4"
        />
        <KpiTile label="Ready for role" value={`${aiReadyCount} / ${data.teamSize}`} sub="AI Ready" />
        <KpiTile
          label="Development active"
          value={`${devActiveCount} / ${data.teamSize}`}
          sub={devOverview ? `${devOverview.aggregateCompletionRate}% avg completion` : "Plans in progress"}
        />
      </div>

      {/* -- Level distribution -- */}
      <div className="bg-card rounded-xl border border-border shadow-md p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-medium text-foreground">Where your team is on the journey</p>
          <Link href="/manager/team-learning">
            <span className="text-xs text-primary hover:text-primary/80 transition-colors">Detail →</span>
          </Link>
        </div>
        <div className="grid gap-8 items-center" style={{ gridTemplateColumns: "200px 1fr" }}>
          <div style={{ position: "relative", width: 200, height: 200 }}>
            <LevelDistributionDonut distribution={levelDistribution} avgScore={teamAvgScore} />
          </div>
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(lv => {
              const d = levelDistribution.find(x => x.level === lv)!;
              const s = getLevelChipStyle(lv);
              return (
                <div key={lv} className="flex items-center justify-between py-1.5" style={{ borderBottom: lv < 5 ? "0.5px solid oklch(22% 0.030 240)" : undefined }}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium flex-shrink-0" style={{ backgroundColor: s.bg, color: s.text }}>{lv}</span>
                    <span className="text-sm font-medium text-foreground">{getLevelLabel(lv)}</span>
                  </div>
                  <span className="text-sm" style={{ color: d.count > 0 ? "#F9FAFB" : "#6B7280" }}>{d.count > 0 ? `${d.count} · ${d.pct}%` : "0"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* -- Worth investigating -- */}
      {insights.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-1 text-foreground">Worth investigating</p>
          {insights.map((ins, i) => (
            <div key={i} style={{ padding: "14px 0", borderBottom: i < insights.length - 1 ? "0.5px solid oklch(22% 0.030 240)" : undefined }}>
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

      {/* -- Capability heatmap -- */}
      <div className="bg-card rounded-xl border border-border shadow-md p-6 overflow-x-auto">
        <p className="text-sm font-medium mb-5 text-foreground">Capability heatmap</p>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4, tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: "26%", textAlign: "left", padding: "8px 10px 12px 0", verticalAlign: "bottom" }}>
                <p className="text-xs uppercase tracking-widest font-medium text-muted-foreground">Team member</p>
              </th>
              {DOMAIN_KEYS.map(k => (
                <th key={k} style={{ textAlign: "center", padding: "8px 4px 12px" }}>
                  <p className="text-xs font-medium text-muted-foreground">{DOMAIN_LABELS[k as keyof typeof DOMAIN_LABELS]}</p>
                </th>
              ))}
              <th style={{ textAlign: "center", padding: "8px 4px 12px" }}>
                <p className="text-xs font-medium text-muted-foreground">Overall</p>
              </th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {data.heatmapData.length === 0 ? (
              <tr>
                <td colSpan={DOMAIN_KEYS.length + 3} className="py-8 text-center text-xs text-muted-foreground">
                  No assessment data yet
                </td>
              </tr>
            ) : (
              data.heatmapData.map(member => {
                const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const hasLowScore = member.overallScore !== null && getLevelFromScore(member.overallScore) <= 1;
                return (
                  <tr key={member.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/people/${member.id}`}>
                    <td style={{ padding: "6px 10px 6px 0" }}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                          style={{ background: hasLowScore ? "oklch(18% 0.040 27)" : "oklch(18% 0.025 240)", color: hasLowScore ? "#F87171" : "#9CA3AF" }}>
                          {initials}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-xs" style={{ color: hasLowScore ? "#F87171" : "#9CA3AF" }}>{member.role}{member.overallScore !== null && ` · ${(member.overallScore / 10).toFixed(1)}`}</p>
                        </div>
                      </div>
                    </td>
                    {DOMAIN_KEYS.map(k => (
                      <td key={k} style={{ padding: "4px 0" }}>
                        <HeatCell score={member.domainScores[k as keyof typeof member.domainScores] ?? null} />
                      </td>
                    ))}
                    <td style={{ padding: "4px 0" }}>
                      {member.overallScore !== null ? (
                        <div className="rounded flex items-center justify-center font-medium" style={{ padding: "10px 4px", background: getLevelChipStyle(getLevelFromScore(member.overallScore)).bg, color: getLevelChipStyle(getLevelFromScore(member.overallScore)).text }}>
                          <span className="text-sm">{(member.overallScore / 10).toFixed(1)}</span>
                        </div>
                      ) : (
                        <div className="rounded flex items-center justify-center" style={{ padding: "10px 4px", background: "oklch(17% 0.028 240)" }}>
                          <span className="text-xs text-muted-foreground">-</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "4px 0" }}>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex items-center gap-4 mt-5 pt-4 flex-wrap" style={{ borderTop: "0.5px solid oklch(22% 0.030 240)" }}>
          <span className="text-xs uppercase tracking-widest font-medium text-muted-foreground">Level</span>
          {[1, 2, 3, 4, 5].map(lv => {
            const s = getLevelChipStyle(lv);
            return (
              <div key={lv} className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: s.bg, display: "inline-block" }} />
                <span className="text-xs text-muted-foreground">{lv} {getLevelLabel(lv)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* -- Conversation prompts -- */}
      <div className="bg-card rounded-xl border border-border shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-foreground">Conversation prompts</p>
          <Link href="/manager/conversation-prompts">
            <span className="text-xs text-primary hover:text-primary/80 transition-colors">All prompts →</span>
          </Link>
        </div>
        {promptsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border" style={{ background: "oklch(17% 0.028 240)" }}>
                <div className="h-5 w-12 rounded-full aiq-shimmer-brand shrink-0" style={{ animationDelay: `${i * 60}ms` }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded aiq-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                  <div className="h-2.5 w-3/4 rounded aiq-shimmer" style={{ animationDelay: `${i * 60 + 30}ms` }} />
                </div>
              </div>
            ))}
          </div>
        ) : !prompts || prompts.prompts.length === 0 ? (
          <p className="text-xs py-4 text-muted-foreground">No conversation prompts at this time. Your team is on track.</p>
        ) : (
          <div className="space-y-3">
            {prompts.prompts.slice(0, promptsExpanded ? undefined : 3).map((prompt, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border" style={{ background: "oklch(17% 0.028 240)" }}>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 shrink-0"
                  style={{
                    background: prompt.priority === "high" ? "oklch(18% 0.040 68)" : "oklch(18% 0.025 240)",
                    color: prompt.priority === "high" ? "#F59E0B" : "var(--muted-foreground)"
                  }}>
                  {prompt.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5 text-foreground">{prompt.memberName}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{prompt.suggestedAction}</p>
                </div>
                <MessageSquareText className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
              </div>
            ))}
            {prompts.prompts.length > 3 && (
              <button onClick={() => setPromptsExpanded(!promptsExpanded)} className="text-xs font-medium flex items-center gap-1 mt-1 text-primary hover:text-primary/80 transition-colors">
                {promptsExpanded ? "Show less" : `Show ${prompts.prompts.length - 3} more`}
                <ChevronRight className={`w-3 h-3 transition-transform ${promptsExpanded ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* -- Team development overview -- */}
      {devOverview && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">Team development</p>
            <Link href="/manager/team-progress">
              <span className="text-xs text-primary hover:text-primary/80 transition-colors">Detail →</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{ background: "oklch(18% 0.040 142)", border: "0.5px solid oklch(30% 0.100 142)" }}>
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4" style={{ color: "var(--primary)" }} /><span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>On track</span></div>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>{devOverview.statusCounts.onTrack}</span>
            </div>
            <div className="p-4 rounded-xl" style={{ background: "oklch(18% 0.040 68)", border: "0.5px solid oklch(30% 0.090 68)" }}>
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} /><span className="text-xs font-semibold" style={{ color: "#F59E0B" }}>Slipping</span></div>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "#F59E0B" }}>{devOverview.statusCounts.slipping}</span>
            </div>
            <div className="p-4 rounded-xl" style={{ background: "oklch(18% 0.040 27)", border: "0.5px solid oklch(30% 0.090 27)" }}>
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" style={{ color: "#FCA5A5" }} /><span className="text-xs font-semibold" style={{ color: "#FCA5A5" }}>Stalled</span></div>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "#FCA5A5" }}>{devOverview.statusCounts.stalled}</span>
            </div>
          </div>
          {devOverview.aggregateCompletionRate > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Team average completion</span>
                <span className="text-xs font-semibold text-foreground">{devOverview.aggregateCompletionRate}%</span>
              </div>
              <div style={{ position: "relative", height: 6, background: "oklch(22% 0.030 240)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${devOverview.aggregateCompletionRate}%`, background: "oklch(72.3% 0.220 142)", borderRadius: 3 }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
