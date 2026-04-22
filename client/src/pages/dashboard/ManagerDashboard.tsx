/**
 * Manager Dashboard — AiQ Enterprise Platform
 *
 * Canonical manager view from the build bible:
 * - Team readiness heatmap (Safe / At Risk / Unsafe / Unknown)
 * - Risk hotspots with priority indicators
 * - Team roster with per-person capability state
 * - Coaching guidance triggers
 */

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExplanationDrawer, ScoreBreakdown } from "@/components/ExplanationDrawer";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  TrendingDown,
  Shield,
  Info,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Readiness State Config ───────────────────────────────────────────────────

const READINESS = {
  safe:    { label: "Safe",       color: "#228833", bg: "bg-[#228833]/8",  border: "border-[#228833]/20", icon: CheckCircle },
  at_risk: { label: "At Risk",    color: "#EE8866", bg: "bg-[#EE8866]/8",  border: "border-[#EE8866]/20", icon: AlertTriangle },
  unsafe:  { label: "Unsafe",     color: "#EE6677", bg: "bg-[#EE6677]/8",  border: "border-[#EE6677]/20", icon: XCircle },
  unknown: { label: "Not Assessed", color: "#9CA3AF", bg: "bg-muted/30",   border: "border-border",       icon: HelpCircle },
} as const;

// ─── Readiness Heatmap ────────────────────────────────────────────────────────

function ReadinessHeatmap({
  distribution,
}: {
  distribution: { safe: number; atRisk: number; unsafe: number; unknown: number; total: number } | null;
}) {
  if (!distribution) return null;

  const segments = [
    { key: "safe",    count: distribution.safe,    ...READINESS.safe },
    { key: "at_risk", count: distribution.atRisk,  ...READINESS.at_risk },
    { key: "unsafe",  count: distribution.unsafe,  ...READINESS.unsafe },
    { key: "unknown", count: distribution.unknown, ...READINESS.unknown },
  ];

  const total = distribution.total || 1;

  return (
    <div className="space-y-3">
      {/* Bar chart */}
      <div className="flex h-8 rounded-xl overflow-hidden gap-0.5">
        {segments.map(seg => {
          const pct = (seg.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={seg.key}
              className="h-full transition-all duration-700 first:rounded-l-xl last:rounded-r-xl"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {segments.map(seg => {
          const Icon = seg.icon;
          return (
            <div key={seg.key} className={cn("flex items-center justify-between p-2.5 rounded-xl border", seg.bg, seg.border)}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: seg.color }} />
                <span className="text-xs font-medium text-foreground">{seg.label}</span>
              </div>
              <span className="text-lg font-bold" style={{ color: seg.color }}>{seg.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Risk Hotspot Card ────────────────────────────────────────────────────────

function RiskHotspotCard({ user }: { user: any }) {
  const state = user.state?.primaryState ?? "unknown";
  const config = READINESS[state as keyof typeof READINESS] ?? READINESS.unknown;
  const Icon = config.icon;

  const reasons: string[] = [];
  if (user.risk?.band === "high") reasons.push("High risk score");
  if (user.credibility?.band === "low") reasons.push("Low credibility");
  if (state === "unsafe") reasons.push("Unsafe readiness state");

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.bg, config.border, "border")}>
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{reasons.join(" · ")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full border"
          style={{
            color: config.color,
            backgroundColor: `${config.color}12`,
            borderColor: `${config.color}30`,
          }}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { data, isLoading } = trpc.dashboard.manager.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const dist = data?.distribution;
  const team = data?.team ?? [];

  // Build canonical distribution object
  const distribution = dist
    ? {
        safe:    dist.proficient ?? 0,
        atRisk:  dist.developing ?? 0,
        unsafe:  dist.needsSupport ?? 0,
        unknown: dist.noData ?? 0,
        total:   dist.total ?? 0,
      }
    : null;

  const hotspots = team.filter(
    (u: any) => u.risk?.band === "high" || u.credibility?.band === "low" || u.state?.primaryState === "unsafe"
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">Team Readiness</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {dist?.total ?? 0} team members · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Team Members",
            value: dist?.total ?? 0,
            icon: Users,
            color: "#10B981",
          },
          {
            label: "Safe to Deploy",
            value: dist?.proficient ?? 0,
            icon: UserCheck,
            color: "#228833",
          },
          {
            label: "At Risk / Unsafe",
            value: (dist?.developing ?? 0) + (dist?.needsSupport ?? 0),
            icon: AlertTriangle,
            color: "#EE8866",
          },
          {
            label: "Not Assessed",
            value: dist?.noData ?? 0,
            icon: HelpCircle,
            color: "#9CA3AF",
          },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${card.color}12` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Readiness Heatmap */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-sora">Readiness Heatmap</CardTitle>
              <ExplanationDrawer
                trigger={
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Info className="w-3 h-3" />
                    How states are assigned
                  </button>
                }
                title="How Readiness States Are Assigned"
                subtitle="AiQ classifies each team member based on their assessment scores and policy compliance"
              >
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p><strong className="text-foreground">Safe:</strong> Overall score ≥ 75, credibility ≥ medium, no active policy restrictions.</p>
                  <p><strong className="text-foreground">At Risk:</strong> Score 50–74, or medium credibility with gaps in key capability areas.</p>
                  <p><strong className="text-foreground">Unsafe:</strong> Score &lt; 50, or low credibility, or active policy restriction in place.</p>
                  <p><strong className="text-foreground">Not Assessed:</strong> No completed assessment on record.</p>
                </div>
              </ExplanationDrawer>
            </div>
          </CardHeader>
          <CardContent>
            <ReadinessHeatmap distribution={distribution} />
          </CardContent>
        </Card>

        {/* Risk Hotspots */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sora flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#EE6677]" />
              Risk Hotspots
              {hotspots.length > 0 && (
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EE6677]/10 text-[#EE6677] border border-[#EE6677]/20">
                  {hotspots.length} flagged
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {hotspots.length > 0 ? (
                hotspots.map((u: any) => <RiskHotspotCard key={u.id} user={u} />)
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-8 h-8 text-[#228833] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#228833]">No risk hotspots</p>
                  <p className="text-xs text-muted-foreground mt-1">All assessed team members are within acceptable thresholds</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Roster */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sora">Team Roster</CardTitle>
            <span className="text-xs text-muted-foreground">{team.length} members</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Readiness</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credibility</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {team.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                      No team members found
                    </td>
                  </tr>
                ) : (
                  team.map((u: any) => {
                    const state = u.state?.primaryState ?? "unknown";
                    const config = READINESS[state as keyof typeof READINESS] ?? READINESS.unknown;
                    const StateIcon = config.icon;

                    const complianceColor =
                      u.state?.complianceState === "compliant" ? "text-[#228833]" :
                      u.state?.complianceState === "at_risk"   ? "text-[#EE8866]" :
                      "text-muted-foreground";

                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: "#10B981" }}
                            >
                              {(u.firstName?.[0] ?? "?").toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border"
                            style={{
                              color: config.color,
                              backgroundColor: `${config.color}12`,
                              borderColor: `${config.color}30`,
                            }}
                          >
                            <StateIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.credibility?.band ? (
                            <span className={cn(
                              "text-xs font-semibold capitalize",
                              u.credibility.band === "high"   ? "text-[#228833]" :
                              u.credibility.band === "medium" ? "text-[#EE8866]" :
                              "text-[#EE6677]"
                            )}>
                              {u.credibility.band}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          {u.risk?.band ? (
                            <span className={cn(
                              "text-xs font-semibold capitalize",
                              u.risk.band === "low"    ? "text-[#228833]" :
                              u.risk.band === "medium" ? "text-[#EE8866]" :
                              "text-[#EE6677]"
                            )}>
                              {u.risk.band}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn("text-xs font-medium capitalize", complianceColor)}>
                            {u.state?.complianceState?.replace(/_/g, " ") ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
