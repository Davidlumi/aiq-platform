/**
 * Manager Dashboard — AiQ Platform
 *
 * Team readiness overview:
 * - Distribution ring (safe / at-risk / unsafe / unknown)
 * - Capability gap bar chart
 * - Risk & credibility alerts
 * - Revalidation due-soon table
 * - Full team member table with inline readiness badges
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Users, AlertTriangle, CheckCircle, XCircle, HelpCircle,
  Calendar, TrendingDown, Search, ChevronRight, RefreshCw,
  BarChart3, ShieldAlert, Award, MessageSquare, TrendingUp,
  Layers, Zap, Info, ArrowUpRight, ArrowDownRight, Minus,
  BookOpen, Flame,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const READINESS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  safe:    { label: "Safe",    color: "#228833", bg: "#22883315", icon: CheckCircle },
  at_risk: { label: "At Risk", color: "#EE8866", bg: "#EE886615", icon: AlertTriangle },
  unsafe:  { label: "Unsafe",  color: "#EE6677", bg: "#EE667715", icon: XCircle },
  unknown: { label: "Unknown", color: "#9CA3AF", bg: "#9CA3AF15", icon: HelpCircle },
};

const CAP_COLORS: Record<string, string> = {
  ai_interaction: "#4477AA", ai_output_evaluation: "#228833", ai_workflow_design: "#0D9488",
  workforce_ai_readiness: "#059669", ai_ethics_trust: "#AA3377", ai_change_leadership: "#D97706",
};

const CAP_LABELS: Record<string, string> = {
  ai_interaction: "AI Interaction", ai_output_evaluation: "Output Evaluation", ai_workflow_design: "Workflow Design",
  workforce_ai_readiness: "Workforce Readiness", ai_ethics_trust: "Ethics & Trust", ai_change_leadership: "Change Leadership",
};

function ReadinessBadge({ readiness }: { readiness: string | null }) {
  const meta = READINESS_META[readiness ?? "unknown"] ?? READINESS_META.unknown;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: meta.bg, color: meta.color }}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function DistributionRing({ distribution }: { distribution: { safe: number; atRisk: number; unsafe: number; unknown: number; total: number } }) {
  const { safe, atRisk, unsafe, unknown, total } = distribution;
  const segments = [
    { value: safe,    color: "#228833", label: "Safe" },
    { value: atRisk,  color: "#EE8866", label: "At Risk" },
    { value: unsafe,  color: "#EE6677", label: "Unsafe" },
    { value: unknown, color: "#9CA3AF", label: "Unknown" },
  ];
  const r = 44;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map(s => {
    const dash = total > 0 ? (s.value / total) * circ : 0;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
          <circle cx="56" cy="56" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="12" />
          {arcs.map((arc, i) => (
            <circle key={i} cx="56" cy="56" r={r} fill="none" stroke={arc.color} strokeWidth="12"
              strokeDasharray={`${arc.dash} ${circ}`} strokeDashoffset={-arc.offset} strokeLinecap="butt" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground font-sora">{total}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="text-xs font-bold text-foreground ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { data, isLoading } = trpc.dashboard.manager.useQuery();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const dist = data?.distribution;
  const capGaps = data?.capabilityGaps ?? [];
  const team = data?.team ?? [];

  const filtered = team.filter(m =>
    !search || `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const revalDueSoon = team
    .filter(m => {
      if (!m.revalidationDue) return false;
      const days = Math.ceil((new Date(m.revalidationDue).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 14;
    })
    .sort((a, b) => new Date(a.revalidationDue!).getTime() - new Date(b.revalidationDue!).getTime())
    .slice(0, 5);

  const highRiskMembers = team
    .filter(m => m.risk?.band === "high" || m.latestReadiness === "unsafe")
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">Team Readiness</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI capability intelligence across your team</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => window.location.reload()}>
          <RefreshCw className="w-3 h-3" />Refresh
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Members",       value: dist?.total ?? 0,                icon: Users,        color: "#4477AA" },
          { label: "Safe",                value: dist?.safe ?? 0,                 icon: CheckCircle,  color: "#228833" },
          { label: "At Risk / Unsafe",    value: (dist?.atRisk ?? 0) + (dist?.unsafe ?? 0), icon: AlertTriangle, color: "#EE6677" },
          { label: "Revalidation Due",    value: dist?.revalidationDueSoon ?? 0,  icon: Calendar,     color: "#EE8866" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-sora">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Distribution + Capability gaps */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <Users className="w-4 h-4 text-[#4477AA]" />Readiness Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dist ? (
              <DistributionRing distribution={dist} />
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <TrendingDown className="w-4 h-4 text-[#EE6677]" />Capability Gaps (Team Average)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {capGaps.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={capGaps.map(g => ({ name: CAP_LABELS[g.capability] ?? g.capability, score: g.avgScore ?? 0 }))}
                  layout="vertical" margin={{ top: 0, right: 16, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={78} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}`, "Avg Score"]} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {capGaps.map((g, i) => (
                      <Cell key={i} fill={CAP_COLORS[g.capability] ?? "#4477AA"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No assessment data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts: High risk + Revalidation due */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <ShieldAlert className="w-4 h-4 text-[#EE6677]" />High Risk Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highRiskMembers.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-[#228833] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No high-risk members</p>
              </div>
            ) : (
              <div className="space-y-2">
                {highRiskMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-[#EE6677]/5 border border-[#EE6677]/15">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-muted-foreground">{m.jobFunction ?? m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ReadinessBadge readiness={m.latestReadiness} />
                      {m.risk?.band === "high" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#EE6677]/10 text-[#EE6677] font-semibold">High Risk</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <Calendar className="w-4 h-4 text-[#EE8866]" />Revalidation Due (14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revalDueSoon.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No revalidations due soon</p>
              </div>
            ) : (
              <div className="space-y-2">
                {revalDueSoon.map(m => {
                  const days = Math.ceil((new Date(m.revalidationDue!).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-[#EE8866]/5 border border-[#EE8866]/15">
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground">{m.jobFunction ?? m.email}</p>
                      </div>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                        days <= 3 ? "bg-[#EE6677]/10 text-[#EE6677]" : "bg-[#EE8866]/10 text-[#EE8866]")}>
                        {days}d
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delegation Tiers */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-sora">
            <Layers className="w-4 h-4 text-[#4477AA]" />Delegation Tiers
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Recommended AI task delegation level based on assessed capability and risk profile</p>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No team data</div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const TIERS = [
                  { key: "autonomous",  label: "Tier 1 — Autonomous",    desc: "Can use AI independently for high-stakes decisions",        color: "#228833", bg: "#22883310", border: "#22883330", test: (m: any) => m.latestReadiness === "safe" && (m.credibility?.band === "high" || m.credibility?.band === "medium") && m.risk?.band !== "high" },
                  { key: "supervised",  label: "Tier 2 — Supervised",    desc: "Can use AI with peer or manager review of key outputs",      color: "#4477AA", bg: "#4477AA10", border: "#4477AA30", test: (m: any) => m.latestReadiness === "at_risk" || (m.latestReadiness === "safe" && m.risk?.band === "high") },
                  { key: "restricted",  label: "Tier 3 — Restricted",    desc: "AI use should be limited to low-stakes, supervised tasks",   color: "#EE8866", bg: "#EE886610", border: "#EE886630", test: (m: any) => m.latestReadiness === "unsafe" && m.risk?.band !== "high" },
                  { key: "paused",      label: "Tier 4 — Paused",        desc: "AI use should be paused pending capability development",     color: "#EE6677", bg: "#EE667710", border: "#EE667730", test: (m: any) => m.latestReadiness === "unsafe" && m.risk?.band === "high" },
                  { key: "unassessed",  label: "Unassessed",             desc: "No assessment data — tier cannot be assigned",              color: "#9CA3AF", bg: "#9CA3AF10", border: "#9CA3AF30", test: (m: any) => !m.latestReadiness },
                ];
                return TIERS.map(tier => {
                  const members = team.filter(tier.test);
                  if (members.length === 0) return null;
                  return (
                    <div key={tier.key} className="rounded-lg border p-3" style={{ borderColor: tier.border, backgroundColor: tier.bg }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: tier.color, backgroundColor: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
                          <span className="text-xs text-muted-foreground">{tier.desc}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: tier.color }}>{members.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {members.slice(0, 8).map(m => (
                          <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-background border border-border text-foreground">
                            {m.firstName} {m.lastName}
                          </span>
                        ))}
                        {members.length > 8 && <span className="text-xs text-muted-foreground">+{members.length - 8} more</span>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Conversations + Misuse Friction Indicators */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <MessageSquare className="w-4 h-4 text-[#0D9488]" />Suggested Conversations
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Team members who would benefit from a 1:1 capability conversation</p>
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No team data</div>
            ) : (() => {
              const suggestions = team
                .filter(m => m.latestReadiness && m.latestReadiness !== "safe")
                .map(m => {
                  const reason = m.latestReadiness === "unsafe" && m.risk?.band === "high"
                    ? "High risk + unsafe classification — discuss AI task restrictions"
                    : m.latestReadiness === "unsafe"
                    ? "Unsafe classification — review AI task scope and support plan"
                    : m.credibility?.band === "low"
                    ? "Low credibility score — explore confidence calibration gaps"
                    : m.revalidationDue && Math.ceil((new Date(m.revalidationDue).getTime() - Date.now()) / 86400000) <= 7
                    ? "Revalidation overdue — discuss reassessment readiness"
                    : "At-risk classification — explore development priorities";
                  const priority = m.latestReadiness === "unsafe" && m.risk?.band === "high" ? 0
                    : m.latestReadiness === "unsafe" ? 1
                    : m.credibility?.band === "low" ? 2 : 3;
                  return { ...m, reason, priority };
                })
                .sort((a, b) => a.priority - b.priority)
                .slice(0, 5);
              if (suggestions.length === 0) return (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-[#228833] mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No urgent conversations needed</p>
                </div>
              );
              return (
                <div className="space-y-2">
                  {suggestions.map(m => (
                    <div key={m.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                      <MessageSquare className="w-3.5 h-3.5 text-[#0D9488] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{m.reason}</p>
                      </div>
                      <ReadinessBadge readiness={m.latestReadiness} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <Zap className="w-4 h-4 text-[#EE8866]" />Misuse Friction Indicators
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Patterns that may indicate AI misuse risk or over-reliance</p>
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No team data</div>
            ) : (() => {
              const indicators = [
                {
                  label: "High risk + safe classification",
                  desc: "High risk score despite safe readiness — may indicate gaming or inconsistent behaviour",
                  members: team.filter(m => m.risk?.band === "high" && m.latestReadiness === "safe"),
                  color: "#EE8866",
                },
                {
                  label: "Low credibility + safe classification",
                  desc: "Low credibility band suggests inconsistent or low-confidence responses despite safe classification",
                  members: team.filter(m => m.credibility?.band === "low" && m.latestReadiness === "safe"),
                  color: "#EE6677",
                },
                {
                  label: "Overdue revalidation",
                  desc: "Assessment is overdue — capability profile may no longer reflect current practice",
                  members: team.filter(m => m.revalidationDue && new Date(m.revalidationDue) < new Date()),
                  color: "#D97706",
                },
              ].filter(i => i.members.length > 0);
              if (indicators.length === 0) return (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-[#228833] mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No friction indicators detected</p>
                </div>
              );
              return (
                <div className="space-y-3">
                  {indicators.map(ind => (
                    <div key={ind.label} className="rounded-lg border p-3" style={{ borderColor: `${ind.color}30`, backgroundColor: `${ind.color}08` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: ind.color }} />
                        <span className="text-xs font-semibold" style={{ color: ind.color }}>{ind.label} ({ind.members.length})</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{ind.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {ind.members.slice(0, 5).map(m => (
                          <span key={m.id} className="text-xs px-1.5 py-0.5 rounded bg-background border border-border text-foreground">{m.firstName} {m.lastName[0]}.</span>
                        ))}
                        {ind.members.length > 5 && <span className="text-xs text-muted-foreground">+{ind.members.length - 5}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* P2-MD-4: Individual Development Trajectory */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-sora">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />Development Trajectories
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Multi-assessment score trend per team member — improving / stable / declining</p>
        </CardHeader>
        <CardContent>
          {team.filter(m => (m as any).scoreHistory?.length >= 2).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Team members need at least 2 completed assessments to show trajectory data.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {team.filter(m => (m as any).scoreHistory?.length >= 2).map(m => {
                const history = ((m as any).scoreHistory as Array<{ sessionId: string; completedAt: Date | null; overallScore: number; readiness: string | null }>).slice().reverse();
                const first = history[0].overallScore;
                const last = history[history.length - 1].overallScore;
                const delta = last - first;
                const trend = delta > 3 ? "improving" : delta < -3 ? "declining" : "stable";
                const trendColor = trend === "improving" ? "#228833" : trend === "declining" ? "#EE6677" : "#EE8866";
                const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
                return (
                  <div key={m.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground">{history.length} assessments</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
                        <span className="text-xs font-bold" style={{ color: trendColor }}>
                          {delta > 0 ? "+" : ""}{Math.round(delta)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end gap-1 h-10">
                      {history.map((h, i) => {
                        const RSTATE_COLORS: Record<string, string> = { safe: "#228833", at_risk: "#EE8866", unsafe: "#EE6677" };
                        const barColor = RSTATE_COLORS[h.readiness ?? "unknown"] ?? "#9CA3AF";
                        const barH = Math.max(4, Math.round((h.overallScore / 100) * 40));
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full rounded-sm" style={{ height: barH, backgroundColor: barColor, opacity: 0.8 }} />
                            <span className="text-[9px] text-muted-foreground tabular-nums">{Math.round(h.overallScore)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{trend}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">Latest: {Math.round(last)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full team table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <Users className="w-4 h-4 text-[#4477AA]" />Team Members ({filtered.length})
            </CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search members..." className="pl-8 h-8 text-xs"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Role / Function", "Readiness", "Score", "Risk", "Credibility", "Last Assessed", "Revalidation"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const revalDays = m.revalidationDue
                    ? Math.ceil((new Date(m.revalidationDue).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div>
                          <p className="font-medium text-foreground">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {m.roleFamily ?? m.jobFunction ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <ReadinessBadge readiness={m.latestReadiness} />
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-foreground">
                        {m.latestScore != null ? Math.round(m.latestScore) : "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {m.risk?.band ? (
                          <span className={cn("text-xs font-semibold capitalize",
                            m.risk.band === "high" ? "text-[#EE6677]" : m.risk.band === "medium" ? "text-[#EE8866]" : "text-[#228833]")}>
                            {m.risk.band}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        {m.credibility?.band ? (
                          <span className={cn("text-xs font-semibold capitalize",
                            m.credibility.band === "high" ? "text-[#228833]" : m.credibility.band === "medium" ? "text-[#EE8866]" : "text-[#EE6677]")}>
                            {m.credibility.band}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {m.lastAssessedAt ? new Date(m.lastAssessedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "Never"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {revalDays != null ? (
                          <span className={cn("text-xs font-semibold",
                            revalDays <= 7 ? "text-[#EE6677]" : revalDays <= 14 ? "text-[#EE8866]" : "text-muted-foreground")}>
                            {revalDays}d
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No members found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Learning Overview */}
      <LearningOverviewSection />
    </div>
  );
}

function LearningOverviewSection() {
  const { data, isLoading } = trpc.adaptiveLearning.getTeamLearningProgress.useQuery();
  const members = data?.members ?? [];
  const avgCompletion = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.plan?.progressPct ?? 0), 0) / members.length)
    : 0;
  const activeStreaks = members.filter(m => (m.streak?.currentStreak ?? 0) > 0).length;
  const noActivity = members.filter(m => !m.streak?.totalModulesCompleted || m.streak.currentStreak === 0).length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 font-sora">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Team Learning Overview
          </CardTitle>
          <Link href="/manager/team-learning">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">AI capability module completion and learning streaks across your team</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No team members yet</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold">{avgCompletion}%</div>
                <div className="text-xs text-muted-foreground">Avg completion</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-orange-600">{activeStreaks}</div>
                <div className="text-xs text-muted-foreground">Active streaks</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-amber-600">{noActivity}</div>
                <div className="text-xs text-muted-foreground">No activity</div>
              </div>
            </div>
            <div className="space-y-2">
              {members.slice(0, 5).map(m => (
                <div key={m.userId} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground w-28 truncate">{m.name}</div>
                  <Progress value={m.plan?.progressPct ?? 0} className="flex-1 h-1.5" />
                  <div className="text-xs tabular-nums w-8 text-right">{m.plan?.progressPct ?? 0}%</div>
                  {(m.streak?.currentStreak ?? 0) > 0 && (
                    <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                  )}
                </div>
              ))}
              {members.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">+{members.length - 5} more</div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
