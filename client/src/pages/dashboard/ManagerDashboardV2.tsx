/**
 * Manager Dashboard — mirrors the CPO dashboard layout exactly.
 * Differences from CPO:
 *   • No Strategy Gap chart / no Strategy Gap Score KPI tile
 *   • No "View strategic roadmap" CTA
 *   • Heatmap shows individual team members (not functions)
 */
import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ManagerDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/DashboardUI";
import { getLevelFromScore, getLevelLabel } from "@/lib/level-utils";
import { Users, UserCircle, ChevronDown, ChevronRight, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_COLOURS as BRAND_DOMAIN_COLOURS, LEVEL_COLOURS } from "@shared/brand";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAIN_ABBR: Record<string, string> = {
  ai_interaction: "Interaction",
  ai_output_evaluation: "Output Eval",
  ai_workflow_design: "Workflow",
  workforce_ai_readiness: "Workforce AI",
  ai_ethics_trust: "Ethics",
  ai_change_leadership: "Change Lead",
};

const DOMAIN_COLOURS = BRAND_DOMAIN_COLOURS as Record<string, string>;

// ─── Shared sub-components (mirrors LeaderDashboardV2) ────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold text-foreground" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const LEVEL_DONUT_COLOURS: Record<number, { fill: string; text: string }> = {
  5: { fill: LEVEL_COLOURS[5].hex, text: LEVEL_COLOURS[5].text },
  4: { fill: LEVEL_COLOURS[4].hex, text: LEVEL_COLOURS[4].text },
  3: { fill: LEVEL_COLOURS[3].hex, text: LEVEL_COLOURS[3].text },
  2: { fill: LEVEL_COLOURS[2].hex, text: LEVEL_COLOURS[2].text },
  1: { fill: LEVEL_COLOURS[1].hex, text: LEVEL_COLOURS[1].text },
};

function ReadinessDonut({ distribution }: { distribution: Array<{ level: number; count: number; pct: number }> }) {
  const R = 80; const r = 52; const cx = 100; const cy = 100;
  const total = distribution.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  let cumAngle = -Math.PI / 2;
  const slices = distribution
    .filter(d => d.count > 0)
    .map(d => {
      const angle = (d.count / total) * 2 * Math.PI;
      const startAngle = cumAngle;
      cumAngle += angle;
      const endAngle = cumAngle;
      const x1 = cx + R * Math.cos(startAngle); const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);   const y2 = cy + R * Math.sin(endAngle);
      const ix1 = cx + r * Math.cos(endAngle);  const iy1 = cy + r * Math.sin(endAngle);
      const ix2 = cx + r * Math.cos(startAngle);const iy2 = cy + r * Math.sin(startAngle);
      const large = angle > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`;
      return { ...d, path, colour: LEVEL_DONUT_COLOURS[d.level]?.fill ?? "#6b7280" };
    });
  return (
    <div className="flex flex-col items-center gap-5">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices.map(s => (
          <path key={s.level} d={s.path} fill={s.colour} opacity={0.9} />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="currentColor" fontSize="24" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="11">assessed</text>
      </svg>
      <div className="grid grid-cols-5 gap-2 w-full">
        {[5, 4, 3, 2, 1].map(lv => {
          const d = distribution.find(x => x.level === lv);
          const count = d?.count ?? 0;
          const pct = d?.pct ?? 0;
          const col = LEVEL_DONUT_COLOURS[lv];
          return (
            <div key={lv} className="flex flex-col items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ background: col.fill }} />
              <span className="text-xs text-muted-foreground text-center leading-tight">{getLevelLabel(lv)}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: count > 0 ? col.fill : "var(--muted-foreground)" }}>
                {pct}%
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

// ─── Team Member Heatmap ──────────────────────────────────────────────────────

function heatmapCellStyle(score: number | null): { bg: string; text: string } {
  if (score == null) return { bg: "var(--muted)", text: "var(--muted-foreground)" };
  const s = score / 10;
  if (s >= 7.5) return { bg: "var(--score-ai-ready-bg)", text: "var(--score-ai-ready-text)" };
  if (s >= 6.0) return { bg: "var(--score-strong-bg)", text: "var(--score-strong-text)" };
  if (s >= 5.0) return { bg: "var(--score-capable-bg)", text: "var(--score-capable-text)" };
  if (s >= 3.5) return { bg: "var(--score-developing-bg)", text: "var(--score-developing-text)" };
  return { bg: "var(--score-gap-bg)", text: "var(--score-gap-text)" };
}

function TeamMemberHeatmap({
  members,
  domains,
}: {
  members: Array<{
    id: string;
    name: string;
    role: string;
    overallScore: number | null;
    domainScores: Record<string, number | null>;
  }>;
  domains: Array<{ key: string; label: string }>;
}) {
  const legendItems = [
    { label: "AI Ready",   range: "≥7.5",    bg: "var(--score-ai-ready-bg)", text: "var(--score-ai-ready-text)" },
    { label: "Strong",     range: "6.0–7.4",  bg: "var(--score-strong-bg)", text: "var(--score-strong-text)" },
    { label: "Capable",    range: "5.0–5.9",  bg: "var(--score-capable-bg)", text: "var(--score-capable-text)" },
    { label: "Developing", range: "3.5–4.9",  bg: "var(--score-developing-bg)", text: "var(--score-developing-text)" },
    { label: "Gap",        range: "<3.5",     bg: "var(--score-gap-bg)", text: "var(--score-gap-text)" },
  ];

  if (members.length === 0) {
    return <p className="text-xs text-muted-foreground py-4">No assessment data yet.</p>;
  }

  return (
    <div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left pb-3 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest sticky left-0 bg-card" style={{ minWidth: "160px" }}>
              Team member
            </th>
            {domains.map(d => (
              <th key={d.key} className="text-center pb-3 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap" style={{ minWidth: "72px" }}>
                {DOMAIN_ABBR[d.key] ?? d.label}
              </th>
            ))}
            <th className="text-center pb-3 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest" style={{ minWidth: "56px" }}>Avg</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, mi) => {
            const rowBg = mi % 2 === 0 ? "var(--card)" : "color-mix(in srgb, var(--muted) 20%, var(--card))";
            const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <tr key={member.id} className="hover:bg-muted/30 transition-colors" style={{ background: rowBg }}>
                <td className="py-2 pr-3 sticky left-0" style={{ background: rowBg }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted-foreground">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-xs truncate max-w-[120px]">{member.name}</p>
                      <p className="text-muted-foreground text-xs truncate max-w-[120px]">{member.role}</p>
                    </div>
                  </div>
                </td>
                {domains.map(d => {
                  const score = member.domainScores[d.key] ?? null;
                  const cell = heatmapCellStyle(score);
                  return (
                    <td key={d.key} className="py-1 px-1 text-center">
                      <span
                        className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-semibold tabular-nums"
                        style={{ background: cell.bg, color: cell.text }}
                      >
                        {score != null ? (score / 10).toFixed(1) : "—"}
                      </span>
                    </td>
                  );
                })}
                <td className="py-1 px-1 text-center">
                  {(() => {
                    const cell = heatmapCellStyle(member.overallScore);
                    return (
                      <span className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold tabular-nums" style={{ background: cell.bg, color: cell.text }}>
                        {member.overallScore != null ? (member.overallScore / 10).toFixed(1) : "—"}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border flex-wrap">
        {legendItems.map(l => (
          <span key={l.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: l.bg, color: l.text }}>
            {l.label} <span className="opacity-70">{l.range}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerDashboardV2() {
  const { data, isLoading } = trpc.dashboardV2.manager.main.useQuery();
  const { data: devOverview } = trpc.dashboardV2.manager.developmentOverview.useQuery();

  // Build domain list from heatmap data (same 6 domains as CPO)
  const DOMAIN_KEYS_ORDER = [
    "ai_interaction",
    "ai_output_evaluation",
    "ai_workflow_design",
    "workforce_ai_readiness",
    "ai_ethics_trust",
    "ai_change_leadership",
  ];
  const DOMAIN_LABEL_MAP: Record<string, string> = {
    ai_interaction: "AI Interaction",
    ai_output_evaluation: "AI Output Evaluation",
    ai_workflow_design: "AI Workflow Design",
    workforce_ai_readiness: "Workforce AI Readiness",
    ai_ethics_trust: "AI Ethics & Trust",
    ai_change_leadership: "AI Change Leadership",
  };

  const domains = DOMAIN_KEYS_ORDER.map(k => ({ key: k, label: DOMAIN_LABEL_MAP[k] }));

  // Derive team members for heatmap from existing manager.main data
  const teamMembers = useMemo(() => {
    if (!data?.heatmapData) return [];
    return data.heatmapData.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role ?? "",
      overallScore: m.overallScore,
      domainScores: m.domainScores as Record<string, number | null>,
    }));
  }, [data?.heatmapData]);

  // Level distribution for donut
  const levelDistribution = useMemo(() => {
    const scored = teamMembers.filter(m => m.overallScore != null);
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    scored.forEach(m => {
      const lv = getLevelFromScore(m.overallScore!);
      counts[lv] = (counts[lv] ?? 0) + 1;
    });
    const total = scored.length || 1;
    return [5, 4, 3, 2, 1].map(lv => ({
      level: lv,
      count: counts[lv],
      pct: Math.round((counts[lv] / total) * 100),
    }));
  }, [teamMembers]);

  // Domain breakdown averages
  const domainDistribution = useMemo(() => {
    return DOMAIN_KEYS_ORDER.map(key => {
      const scores = teamMembers
        .map(m => m.domainScores[key])
        .filter((s): s is number => s != null);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return {
        domain: key,
        domainName: DOMAIN_LABEL_MAP[key],
        avgScore: avg,
        totalAssessed: scores.length,
      };
    }).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
  }, [teamMembers]);

  // KPI derivations
  const teamAvgScore = useMemo(() => {
    const scored = teamMembers.filter(m => m.overallScore != null);
    if (!scored.length) return null;
    return scored.reduce((sum, m) => sum + (m.overallScore ?? 0), 0) / scored.length;
  }, [teamMembers]);

  const aiReadyCount = useMemo(() => teamMembers.filter(m => m.overallScore != null && getLevelFromScore(m.overallScore) >= 5).length, [teamMembers]);
  const assessedCount = useMemo(() => teamMembers.filter(m => m.overallScore != null).length, [teamMembers]);
  const atRiskCount = useMemo(() => teamMembers.filter(m => m.overallScore != null && getLevelFromScore(m.overallScore) <= 2).length, [teamMembers]);
  const assessedPct = data?.teamSize ? Math.round((assessedCount / data.teamSize) * 100) : 0;
  const aiReadyPct = assessedCount > 0 ? Math.round((aiReadyCount / assessedCount) * 100) : 0;

  // "Worth your attention" insights
  const worthAttention = useMemo(() => {
    const result: Array<{ type: "high" | "medium" | "strategic"; priority: string; title: string; body: string; linkLabel: string; linkHref: string }> = [];
    if (atRiskCount > 0) {
      result.push({
        type: "high",
        priority: "High priority",
        title: `${atRiskCount} team member${atRiskCount !== 1 ? "s" : ""} have a capability gap`,
        body: `${atRiskCount} employee${atRiskCount !== 1 ? "s" : ""} are at Developing or below and need support.`,
        linkLabel: "View team members",
        linkHref: "/people",
      });
    }
    const weakestDomain = [...domainDistribution].filter(d => d.avgScore !== null).sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0))[0];
    if (weakestDomain) {
      result.push({
        type: "medium",
        priority: "Domain gap",
        title: `${weakestDomain.domainName} is the weakest domain`,
        body: `Team average ${weakestDomain.avgScore != null ? (weakestDomain.avgScore / 10).toFixed(1) : "—"} · ${weakestDomain.totalAssessed} assessed.`,
        linkLabel: "View breakdown",
        linkHref: "/people",
      });
    }
    return result.slice(0, 3);
  }, [atRiskCount, domainDistribution]);

  if (isLoading) return <ManagerDashboardSkeleton />;
  if (!data) return (
    <div className="">
      <EmptyState title="No team data" description="You don't have any team members assigned yet." />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Manager Dashboard</p>
          <h1 className="text-xl font-bold text-foreground">{data.manager.teamName || "My Team"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Users className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {data.teamSize} team member{data.teamSize !== 1 ? "s" : ""} · {assessedCount} assessed ({assessedPct}%)
          </p>
        </div>
      </div>

      {/* ── 4 KPI tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Team average"
          value={teamAvgScore !== null ? (teamAvgScore / 10).toFixed(1) : "—"}
          sub="Capability level"
        />
        <KpiCard
          label="AI Ready"
          value={`${aiReadyPct}%`}
          sub={`${aiReadyCount} of ${assessedCount}`}
          accent={aiReadyPct >= 50 ? "#22c55e" : undefined}
        />
        <KpiCard
          label="Capability gaps"
          value={atRiskCount}
          sub="Need support"
          accent={atRiskCount > 0 ? "#ef4444" : undefined}
        />
        <KpiCard
          label="Assessment coverage"
          value={`${assessedPct}%`}
          sub={`${assessedCount} of ${data.teamSize}`}
        />
      </div>

      {/* ── Two-column: Readiness donut + Domain breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Readiness donut */}
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Readiness distribution</p>
          <ReadinessDonut distribution={levelDistribution} />
        </div>

        {/* Domain breakdown */}
        {domainDistribution.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Domain breakdown</p>
            <div>
              {domainDistribution.map(d => (
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

      {/* ── Team Member Heatmap ── */}
      {teamMembers.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Team capability heatmap</p>
              <p className="text-xs text-muted-foreground mt-0.5">Individual scores across all six domains</p>
            </div>
            <Badge variant="outline" className="text-xs">{teamMembers.length} members</Badge>
          </div>
          <TeamMemberHeatmap members={teamMembers} domains={domains} />
        </div>
      )}

      {/* ── Worth your attention ── */}
      {worthAttention.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Worth your attention</p>
          <div className="space-y-4">
            {worthAttention.map((ins, i) => {
              const iconColour = ins.type === "high" ? "#ef4444" : ins.type === "medium" ? "#f59e0b" : "var(--primary)";
              const Icon = ins.type === "high" ? AlertTriangle : TrendingUp;
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
    </div>
  );
}
