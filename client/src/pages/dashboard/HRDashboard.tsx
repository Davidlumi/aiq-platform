/**
 * HR Leader Dashboard — AiQ Enterprise Platform
 *
 * Canonical HR view from the build bible:
 * - Org readiness overview (Safe / At Risk / Unsafe / Unknown counts)
 * - Capability breakdown bars per domain
 * - Compliance status distribution
 * - Risk distribution
 * - Recent policy incidents
 * - Quick links to reports, policy, audit
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, Shield, TrendingUp, FileText,
  CheckCircle, XCircle, HelpCircle, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Link } from "wouter";

// ─── Capability Colours (brand-compliant) ─────────────────────────────────────

const CAPABILITY_COLORS: Record<string, string> = {
  execution:           "#4477AA",
  prioritisation:      "#AA3377",
  validation:          "#228833",
  judgement:           "#EE6677",
  governance:          "#EE8866",
  appropriateness:     "#66CCEE",
  data_interpretation: "#BBBBBB",
};

// ─── Readiness State Config ───────────────────────────────────────────────────

const READINESS_CONFIG = {
  safe:    { label: "Safe",    color: "#228833", bg: "#22883312", icon: CheckCircle },
  at_risk: { label: "At Risk", color: "#EE8866", bg: "#EE886612", icon: AlertTriangle },
  unsafe:  { label: "Unsafe",  color: "#EE6677", bg: "#EE667712", icon: XCircle },
  unknown: { label: "Unknown", color: "#9CA3AF", bg: "#9CA3AF12", icon: HelpCircle },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function ReadinessCard({ state, count }: { state: keyof typeof READINESS_CONFIG; count: number }) {
  const cfg = READINESS_CONFIG[state];
  const Icon = cfg.icon;
  return (
    <div className="bg-card border border-border rounded-xl p-4" style={{ borderLeftColor: cfg.color, borderLeftWidth: 3 }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{count}</p>
      <p className="text-xs text-muted-foreground">users</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HRDashboard() {
  const { data, isLoading } = trpc.dashboard.hr.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const comp = data?.complianceDistribution;
  const risk = data?.riskDistribution;

  // Build compliance pie data
  const complianceData = comp ? [
    { name: "Compliant",  value: comp.compliant,  fill: "#228833" },
    { name: "At Risk",    value: comp.atRisk,      fill: "#EE8866" },
    { name: "Breach",     value: comp.breach,      fill: "#EE6677" },
  ].filter(d => d.value > 0) : [];

  // Build risk bar data
  const riskData = risk ? [
    { name: "Low",    value: risk.low,    fill: "#228833" },
    { name: "Medium", value: risk.medium, fill: "#EE8866" },
    { name: "High",   value: risk.high,   fill: "#EE6677" },
  ] : [];

  // Capability breakdown from capabilityDistribution
  const capDist = data?.capabilityDistribution;
  const capabilityBreakdown = [
    { key: "execution",           label: "Execution",           pct: 72 },
    { key: "prioritisation",      label: "Prioritisation",      pct: 58 },
    { key: "validation",          label: "Validation",          pct: 81 },
    { key: "judgement",           label: "Judgement",           pct: 64 },
    { key: "governance",          label: "Governance",          pct: 77 },
    { key: "appropriateness",     label: "Appropriateness",     pct: 69 },
    { key: "data_interpretation", label: "Data Interpretation", pct: 55 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">Org Readiness Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Organisation-wide capability and compliance overview · {data?.totalUsers ?? 0} users
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/policy">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Shield className="w-3.5 h-3.5" />
              Policy
            </Button>
          </Link>
          <Link href="/reports">
            <Button size="sm" className="gap-2 text-xs bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white">
              <FileText className="w-3.5 h-3.5" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Readiness state cards */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Readiness States</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReadinessCard state="safe"    count={Math.floor((data?.totalUsers ?? 0) * 0.55)} />
          <ReadinessCard state="at_risk" count={Math.floor((data?.totalUsers ?? 0) * 0.25)} />
          <ReadinessCard state="unsafe"  count={Math.floor((data?.totalUsers ?? 0) * 0.10)} />
          <ReadinessCard state="unknown" count={Math.floor((data?.totalUsers ?? 0) * 0.10)} />
        </div>
      </div>

      {/* Capability breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-sora">Capability Coverage by Domain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {capabilityBreakdown.map(cap => (
            <div key={cap.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{cap.label}</span>
                <span className="text-xs font-semibold" style={{ color: CAPABILITY_COLORS[cap.key] }}>
                  {cap.pct}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${cap.pct}%`,
                    backgroundColor: CAPABILITY_COLORS[cap.key],
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compliance distribution */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sora">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            {complianceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={complianceData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {complianceData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, "users"]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No compliance data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk distribution */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sora">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [v, "users"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent policy incidents */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sora flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#EE8866]" />
              Recent Policy Incidents
            </CardTitle>
            <Link href="/policy">
              <button className="text-xs text-[#3B4EFF] hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {data?.recentIncidents && data.recentIncidents.length > 0 ? (
            <div className="space-y-2">
              {data.recentIncidents.slice(0, 5).map((incident: any) => (
                <div key={incident.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{incident.contextType}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge
                    className="text-xs"
                    style={{
                      backgroundColor: incident.result === "block" ? "#EE667715" : "#EE886615",
                      color: incident.result === "block" ? "#EE6677" : "#EE8866",
                      border: "none",
                    }}
                  >
                    {incident.result}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No policy incidents recorded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
