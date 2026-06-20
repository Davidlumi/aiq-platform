/**
 * CPO / Leader Dashboard — redesigned for consistency with the AiQ design system.
 * Clean card-based layout, consistent border/card/foreground tokens, team × domain heatmap.
 */
import React, { useState, useMemo } from "react";
import { Redirect } from "wouter";
import { formatScore } from "@/lib/peakon-colors";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useGate } from "@/contexts/GateContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { LeaderDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/DashboardUI";
import { getLevelFromScore, getLevelChipStyle, getLevelLabel } from "@/lib/level-utils";
import { Users, UserCircle, Filter, Target, TrendingUp, AlertTriangle, ChevronRight, ChevronDown, MapPin, Info, Sparkles } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import BenchmarkComparison from "@/components/BenchmarkComparison";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from "recharts";
import { DOMAIN_COLOURS as BRAND_DOMAIN_COLOURS, LEVEL_COLOURS } from "@shared/brand";

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

// Domain colours from canonical brand.ts
const DOMAIN_COLOURS = BRAND_DOMAIN_COLOURS as Record<string, string>;

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

// Level colours from canonical brand.ts
const LEVEL_DONUT_COLOURS: Record<number, { fill: string; text: string }> = {
  5: { fill: LEVEL_COLOURS[5].hex, text: LEVEL_COLOURS[5].text },
  4: { fill: LEVEL_COLOURS[4].hex, text: LEVEL_COLOURS[4].text },
  3: { fill: LEVEL_COLOURS[3].hex, text: LEVEL_COLOURS[3].text },
  2: { fill: LEVEL_COLOURS[2].hex, text: LEVEL_COLOURS[2].text },
  1: { fill: LEVEL_COLOURS[1].hex, text: LEVEL_COLOURS[1].text },
};

function ReadinessDonut({ distribution }: { distribution: Array<{ level: number; count: number; pct: number }> }) {
  const R = 80; // outer radius — bigger donut
  const r = 52; // inner radius
  const cx = 100; const cy = 100;
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
      return { ...d, path, colour: LEVEL_DONUT_COLOURS[d.level]?.fill ?? "var(--muted-foreground)" };
    });

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Donut SVG — centred, larger */}
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices.map(s => (
          <path key={s.level} d={s.path} fill={s.colour} opacity={0.9} />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="currentColor" fontSize="24" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">assessed</text>
      </svg>
      {/* Legend — horizontal row of pills below the donut */}
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
        {score != null ? formatScore(score) : "—"}
      </span>
    </div>
  );
}

// ─── Team × Domain Heatmap ────────────────────────────────────────────────────

function heatmapCellStyle(score: number | null): { bg: string; text: string } {
  if (score == null) return { bg: "var(--muted)", text: "var(--muted-foreground)" };
  const s = score / 10; // 0–10
  if (s >= 7.5) return { bg: "var(--score-ai-ready-bg)", text: "var(--score-ai-ready-text)" };
  if (s >= 6.0) return { bg: "var(--score-strong-bg)", text: "var(--score-strong-text)" };
  if (s >= 5.0) return { bg: "var(--score-capable-bg)", text: "var(--score-capable-text)" };
  if (s >= 3.5) return { bg: "var(--score-developing-bg)", text: "var(--score-developing-text)" };
  return { bg: "var(--score-gap-bg)", text: "var(--score-gap-text)" };
}

function FunctionHeatmap({
  functions, domains,
}: {
  functions: Array<{
    key: string;
    label: string;
    memberCount: number;
    assessedCount: number;
    domainAvgs: Record<string, number | null>;
    overallAvg: number | null;
    belowThreshold?: boolean;
    anonymisationThreshold?: number;
    members: Array<{
      id: string;
      name: string;
      jobFunction: string | null;
      domainScores: Record<string, number>;
      overallScore: number | null;
    }>;
  }>;
  domains: Array<{ key: string; label: string }>;
}) {
  const [expandedFns, setExpandedFns] = useState<Set<string>>(new Set());
  if (functions.length === 0) return null;
  const DOMAIN_ABBR: Record<string, string> = {
    ai_interaction: "Interaction",
    ai_output_evaluation: "Output Eval",
    ai_workflow_design: "Workflow",
    workforce_ai_readiness: "Workforce AI",
    ai_ethics_trust: "Ethics",
    ai_change_leadership: "Change Lead",
  };
  const abbr = (key: string, label: string) => DOMAIN_ABBR[key] ?? label.replace(/^AI /, "").split(" ").slice(0, 2).join(" ");
  const toggleFn = (key: string) => {
    setExpandedFns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const legendItems = [
    { label: "AI Ready",   range: "≥7.5",    bg: "var(--score-ai-ready-bg)", text: "var(--score-ai-ready-text)" },
    { label: "Strong",     range: "6.0–7.4",  bg: "var(--score-strong-bg)", text: "var(--score-strong-text)" },
    { label: "Capable",    range: "5.0–5.9",  bg: "var(--score-capable-bg)", text: "var(--score-capable-text)" },
    { label: "Developing", range: "3.5–4.9",  bg: "var(--score-developing-bg)", text: "var(--score-developing-text)" },
    { label: "Gap",        range: "<3.5",     bg: "var(--score-gap-bg)", text: "var(--score-gap-text)" },
  ];
  return (
    <div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left pb-3 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest sticky left-0 bg-card" style={{ minWidth: "160px" }}>Function</th>
            {domains.map(d => (
              <th key={d.key} className="text-center pb-3 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap" style={{ minWidth: "72px" }}>
                {abbr(d.key, d.label)}
              </th>
            ))}
            <th className="text-center pb-3 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest" style={{ minWidth: "56px" }}>Avg</th>
          </tr>
        </thead>
        <tbody>
          {functions.map((fn, fi) => {
            const isExpanded = expandedFns.has(fn.key);
            const rowBg = fi % 2 === 0 ? "var(--card)" : "color-mix(in srgb, var(--muted) 20%, var(--card))";
            return (
              <React.Fragment key={fn.key}>
                {/* Function summary row */}
                <tr
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleFn(fn.key)}
                >
                  <td className="py-2.5 pr-4 sticky left-0" style={{ background: rowBg }}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 flex-shrink-0 text-muted-foreground">
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-xs truncate max-w-[130px]">{fn.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {fn.memberCount} members · {fn.assessedCount} assessed
                        </p>
                      </div>
                    </div>
                  </td>
                  {fn.belowThreshold ? (
                    <td colSpan={domains.length + 1} className="py-1 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground italic">
                        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z"/></svg>
                        Scores hidden — fewer than {fn.anonymisationThreshold ?? 7} assessed
                      </span>
                    </td>
                  ) : (
                    <>
                      {domains.map(d => {
                        const score = fn.domainAvgs[d.key] ?? null;
                        const cell = heatmapCellStyle(score);
                        return (
                          <td key={d.key} className="py-1 px-1 text-center">
                            <span
                              className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-semibold tabular-nums"
                              style={{ background: cell.bg, color: cell.text }}
                            >
                              {score != null ? formatScore(score) : "—"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-1 px-1 text-center">
                        {(() => {
                          const cell = heatmapCellStyle(fn.overallAvg);
                          return (
                            <span className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold tabular-nums" style={{ background: cell.bg, color: cell.text }}>
                              {fn.overallAvg != null ? formatScore(fn.overallAvg) : "—"}
                            </span>
                          );
                        })()}
                      </td>
                    </>
                  )}
                </tr>
                {/* Expanded member sub-rows */}
                {isExpanded && fn.members.map((member) => {
                  const assessed = member.overallScore !== null;
                  return (
                    <tr key={member.id} className="border-l-2 border-primary/20" style={{ background: "color-mix(in srgb, var(--primary) 5%, var(--card))" }}>
                      <td className="py-1.5 pr-4 pl-8 sticky left-0" style={{ background: "color-mix(in srgb, var(--primary) 5%, var(--card))" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-xs truncate max-w-[120px]">{member.name || "Unknown"}</p>
                            {member.jobFunction && (
                              <p className="text-muted-foreground text-xs truncate max-w-[120px]">{member.jobFunction}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {domains.map(d => {
                        const score = assessed ? (member.domainScores[d.key] ?? null) : null;
                        const cell = heatmapCellStyle(score);
                        return (
                          <td key={d.key} className="py-1 px-1 text-center">
                            <span
                              className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-medium tabular-nums"
                              style={{ background: cell.bg, color: cell.text }}
                            >
                              {score != null ? formatScore(score) : "—"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-1 px-1 text-center">
                        {(() => {
                          const cell = heatmapCellStyle(member.overallScore);
                          return (
                            <span className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-semibold tabular-nums" style={{ background: cell.bg, color: cell.text }}>
                              {member.overallScore != null ? formatScore(member.overallScore) : "—"}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {/* Legend — outside scroll container so scrollbar doesn't bleed through */}
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

export default function LeaderDashboardV2() {
  const gate = useGate();
  const { viewAs } = useViewAs();

  // All hooks must be declared unconditionally before any early return
  const [roleFamily, setRoleFamily] = useState<string | undefined>(undefined);
  // When rendered via the demo role-switcher (viewAs=cpo), pass demoMode:true to bypass server role check
  const demoMode = viewAs === "cpo" ? true : undefined;
  const queryInput = useMemo(
    () => ({ ...(roleFamily ? { roleFamily } : {}), ...(demoMode ? { demoMode } : {}) }),
    [roleFamily, demoMode]
  );

  const { data: hero, isLoading: heroLoading } = trpc.dashboardV2.leader.heroFinding.useQuery(queryInput);
  const { data: main, isLoading: mainLoading } = trpc.dashboardV2.leader.main.useQuery(queryInput);
  const { data: findings } = trpc.dashboardV2.leader.strategicFindings.useQuery(queryInput);
  const { data: heatmapData } = trpc.dashboardV2.leader.functionHeatmap.useQuery(demoMode ? { demoMode } : undefined);
  const { data: ambitionGap } = trpc.dashboardV2.leader.ambitionGap.useQuery(queryInput);

  const isLoading = heroLoading || mainLoading;

  // All useMemo hooks must be declared unconditionally BEFORE any early return (Rules of Hooks)
  const levelDistribution = useMemo(() => {
    if (!main) return [];
    // Prefer server-computed 5-level distribution (accurate Strong/Capable split)
    if ((main as any).levelDistribution?.length > 0) {
      return (main as any).levelDistribution as Array<{ level: number; count: number; pct: number }>;
    }
    // Fallback: derive from ratingCounts (no Strong/Capable split)
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
    const preciseAvg = main.functionScore !== null ? formatScore(main.functionScore) : "-";
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
      result.push({ type: "medium", priority: "Domain gap", title: `${weakestDomain.domainName} is the weakest domain`, body: `Function average ${formatScore(weakestDomain.avgScore!)} · ${weakestDomain.totalAssessed} assessed.`, linkLabel: "View breakdown", linkHref: "/admin/org-context" });
    }
    if (ambitionGap?.configured && ambitionGap.gapRaw !== null && ambitionGap.gapRaw > 0) {
      result.push({ type: "strategic", priority: "Ambition gap", title: `Function is ${formatScore(ambitionGap.gapRaw)} below AI ambition target`, body: `Current ${ambitionGap.functionAvgRaw !== null ? formatScore(ambitionGap.functionAvgRaw) : "-"} vs target ${ambitionGap.ambitionTargetScore !== null ? formatScore(ambitionGap.ambitionTargetScore) : "-"}.`, linkLabel: "View roadmap", linkHref: "/strategy" });
    }
    return result.slice(0, 3);
  }, [main, ambitionGap]);

  // F2 fix: reward-mode tenants redirect to the reward journey.
  // Reward routes are hidden in Phase 1 — do not redirect reward tenants into hidden routes.
  // RoleDashboard already renders IndividualDashboardV2 for reward-only users, so this
  // component should never be reached by them. Guard here as a safety net.
  if (gate.tenantMode === "reward") {
    return null;
  }

  if (isLoading) return <LeaderDashboardSkeleton />;
  if (!main) return (
    <div className="max-w-7xl mx-auto">
      <EmptyState title="No function data" description="No assessment data available for your function yet." />
    </div>
  );

  const aiReadyPct = main.assessedCount > 0 ? Math.round(((main.ratingCounts.ai_ready ?? 0) / main.assessedCount) * 100) : 0;
  const assessedPct = main.totalHeadcount > 0 ? Math.round((main.assessedCount / main.totalHeadcount) * 100) : 0;
  const atRiskCount = (main.ratingCounts.not_yet_ready ?? 0) + (main.ratingCounts.foundation_gap ?? 0);

  return (
    <div className="space-y-6">

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
            <Link href="/strategy">
              <Button size="sm">View strategic roadmap</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Strategic intelligence onboarding card (shown when AI roadmap not configured) ── */}
      {!ambitionGap?.configured && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">Unlock strategic intelligence</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Step 2 of 2</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Your function capability data is live — {main.assessedCount} of {main.totalHeadcount} assessed, function average {main.functionScore !== null ? formatScore(main.functionScore) : "—"}.
                {" "}Configure your AI roadmap to unlock gap analysis, trajectory projections, and board-ready strategic intelligence.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/admin/org-context">
                  <Button size="sm" className="gap-1.5"><MapPin className="w-3.5 h-3.5" />Configure AI roadmap</Button>
                </Link>
                <Link href="/strategy">
                  <Button size="sm" variant="outline" className="gap-1.5">Preview strategy builder</Button>
                </Link>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/10 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Gap-to-initiative mapping</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">Unlocks after setup</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">90-day trajectory</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">Unlocks after setup</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Board-ready export</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">Unlocks after setup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5 KPI tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Function average" value={main.functionScore !== null ? formatScore(main.functionScore) : "—"} sub="Capability level" />
        <KpiCard label="AI Ready" value={`${aiReadyPct}%`} sub={`${main.ratingCounts.ai_ready ?? 0} of ${main.assessedCount}`} accent="#22c55e" />
        <KpiCard label="Capability gaps" value={atRiskCount} sub="Need urgent support" accent={atRiskCount > 0 ? "#ef4444" : undefined} />
        <KpiCard label="Assessment coverage" value={`${assessedPct}%`} sub={`${main.assessedCount} of ${main.totalHeadcount}`} />
        <KpiCard
          label="Strategy gap score"
          value={ambitionGap?.configured ? (ambitionGap.gapRaw !== null ? (ambitionGap.gapRaw > 0 ? `+${formatScore(ambitionGap.gapRaw)}` : formatScore(ambitionGap.gapRaw)) : "—") : "—"}
          sub={ambitionGap?.configured ? (ambitionGap.ambitionTargetLabel ?? "vs. target") : "Configure roadmap"}
          accent={ambitionGap?.gapRaw != null ? (ambitionGap.gapRaw > 10 ? "#ef4444" : ambitionGap.gapRaw > 0 ? "#f59e0b" : "#22c55e") : undefined}
        />
      </div>

      {/* ── Two-column: Level distribution + Domain breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Level distribution */}
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Readiness distribution</p>
          <ReadinessDonut distribution={levelDistribution} />
          <Link href="/strategy">
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


      {/* ── Strategy Gap Chart ── */}
      {ambitionGap?.configured && ambitionGap.functionAvgRaw !== null && ambitionGap.ambitionTargetScore !== null && (() => {
        const current = ambitionGap.functionAvgRaw! / 10;
        const target = ambitionGap.ambitionTargetScore! / 10;
        const gap = target - current;
        const gapColour = gap > 1 ? "#ef4444" : gap > 0 ? "#f59e0b" : "#22c55e";
        const domainChartData = (main.domainDistribution ?? []).map((d: any) => ({
          name: d.domainName.replace("AI ", "").replace("Workforce ", ""),
          current: d.avgScore !== null ? +formatScore(d.avgScore) : 0,
          target: +target.toFixed(1),
          colour: BRAND_DOMAIN_COLOURS[d.domain as keyof typeof BRAND_DOMAIN_COLOURS] ?? "#6366f1",
        }));
        return (
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-semibold text-foreground">Strategy capability gap</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current vs AI ambition target{ambitionGap.ambitionTargetLabel ? ` · Goal: "${ambitionGap.ambitionTargetLabel}"` : ""}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-xl font-bold text-foreground">{current.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-xl font-bold text-primary">{target.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Gap</p>
                  <p className="text-xl font-bold" style={{ color: gapColour }}>{gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="h-52 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainChartData} margin={{ top: 12, right: 16, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} ticks={[0,2,4,6,8,10]} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                    formatter={(value: number, name: string) => [value.toFixed(1), name === "current" ? "Current score" : "Target"]}
                  />
                  <ReferenceLine y={target} stroke="var(--primary)" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: `Target ${target.toFixed(1)}`, position: "insideTopRight", fontSize: 10, fill: "var(--primary)", dy: -6 }} />
                  <Bar dataKey="current" name="current" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {domainChartData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.colour} fillOpacity={0.85} />
                    ))}
                    <LabelList dataKey="current" position="top" style={{ fontSize: 10, fill: "var(--muted-foreground)" }} formatter={(v: number) => v.toFixed(1)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 justify-end">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "var(--primary)", opacity: 0.7 }} />
                <span className="text-xs text-muted-foreground">Domain score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0" style={{ borderTop: "2px dashed var(--primary)" }} />
                <span className="text-xs text-muted-foreground">Target {target.toFixed(1)}</span>
              </div>
              <Link href="/strategy">
                <span className="text-xs font-semibold text-primary hover:text-primary/80">View roadmap →</span>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ── Function × Domain Heatmap ── */}
      {heatmapData && heatmapData.functions.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 max-w-none">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Function capability heatmap</p>
              <p className="text-xs text-muted-foreground mt-0.5">Average score per function across all six domains · click a row to expand members</p>
            </div>
            <Badge variant="outline" className="text-xs">{heatmapData.functions.length} functions</Badge>
          </div>
          <FunctionHeatmap functions={heatmapData.functions} domains={heatmapData.domains} />
        </div>
      )}

      {/* ── Industry Benchmark Comparison ── */}
      <BenchmarkComparison />

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
    </div>
  );
}
