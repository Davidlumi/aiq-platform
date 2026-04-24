/**
 * CPO / HR Leader Dashboard — AiQ Platform
 *
 * World-class enterprise intelligence view:
 * - Above-fold KPI strip (total assessed, safe %, compliance, revalidation due)
 * - Capability Heatmap: 6-domain grid with colour-coded average scores
 * - Readiness Trajectory: 12-month line chart with projected safe date
 * - Strategic Mismatch Feed: domain gaps vs AI ambition level
 * - Regulatory Zone: compliance funnel + risk distribution + revalidation
 * - Recent Policy Incidents + Config Audit Log
 * - CSV export for capability summary
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, CheckCircle, AlertTriangle, BarChart3,
  ShieldCheck, ShieldAlert, Calendar, FileText, Activity,
  TrendingUp, RefreshCw, Download, Info, Target, Globe, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CAP_COLORS: Record<string, string> = {
  ai_interaction:         "#4477AA",
  ai_output_evaluation:   "#228833",
  ai_workflow_design:     "#0D9488",
  workforce_ai_readiness: "#059669",
  ai_ethics_trust:        "#AA3377",
  ai_change_leadership:   "#D97706",
};
const CAP_LABELS: Record<string, string> = {
  ai_interaction:         "AI Interaction",
  ai_output_evaluation:   "Output Evaluation",
  ai_workflow_design:     "Workflow Design",
  workforce_ai_readiness: "Workforce Readiness",
  ai_ethics_trust:        "Ethics & Trust",
  ai_change_leadership:   "Change Leadership",
};
const SEVERITY_COLORS = {
  critical: "#EE6677",
  moderate: "#EE8866",
  minor:    "#D97706",
  none:     "#228833",
};

// ─── Score → heatmap colour ───────────────────────────────────────────────────
function scoreToHeatClass(score: number | null): string {
  if (score === null) return "bg-muted/40 text-muted-foreground";
  if (score >= 75) return "bg-[#228833]/15 text-[#228833]";
  if (score >= 65) return "bg-[#0D9488]/15 text-[#0D9488]";
  if (score >= 55) return "bg-[#D97706]/15 text-[#D97706]";
  if (score >= 45) return "bg-[#EE8866]/15 text-[#EE8866]";
  return "bg-[#EE6677]/15 text-[#EE6677]";
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <p className="text-3xl font-bold text-foreground font-sora">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color = "#4477AA" }: {
  icon: any; title: string; subtitle?: string; color?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground font-sora">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── CSV export helper ────────────────────────────────────────────────────────
function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HRDashboard() {
  const { data, isLoading, refetch } = trpc.dashboard.hr.useQuery();
  const { data: trajectoryData } = trpc.dashboard.orgTrajectory.useQuery();
  const { data: mismatchData } = trpc.dashboard.orgStrategicMismatch.useQuery();
  const [activeCapTab, setActiveCapTab] = useState<"heatmap" | "bar">("heatmap");

  const handleExport = useCallback(() => {
    const caps = data?.capabilityBreakdown ?? [];
    const rows = caps.map(c => ({
      capability: CAP_LABELS[c.capability] ?? c.capability,
      avg_score: c.avgScore ?? "N/A",
      assessed_count: c.assessedCount,
    }));
    exportToCsv("aiq-capability-summary.csv", rows);
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const rd = data?.readinessDistribution;
  const comp = data?.complianceDistribution;
  const risk = data?.riskDistribution;
  const reval = data?.revalidationStats;
  const caps = data?.capabilityBreakdown ?? [];
  const incidents = data?.recentIncidents ?? [];
  const auditLog = data?.recentAudit ?? [];
  const total = rd?.total ?? 0;
  const safePercent = total > 0 ? Math.round(((rd?.safe ?? 0) / total) * 100) : 0;
  const compliancePercent = total > 0 ? Math.round(((comp?.compliant ?? 0) / total) * 100) : 0;

  // Trajectory data
  const trajectoryPoints = trajectoryData?.dataPoints ?? [];
  const projectedMonths = trajectoryData?.projectedMonthsToSafe;
  const currentAvg = trajectoryData?.currentAvgScore;

  // Mismatch feed — sorted by gap descending
  const mismatches = (mismatchData?.domains ?? [])
    .filter(d => d.severity !== "none")
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));

  // Compliance + risk pie data
  const compliancePie = [
    { name: "Compliant", value: comp?.compliant ?? 0, color: "#228833" },
    { name: "At Risk",   value: comp?.atRisk ?? 0,    color: "#EE8866" },
    { name: "Breach",    value: comp?.breach ?? 0,    color: "#EE6677" },
    { name: "No Data",   value: comp?.noData ?? 0,    color: "#9CA3AF" },
  ].filter(d => d.value > 0);

  const riskPie = [
    { name: "Low",    value: risk?.low ?? 0,    color: "#228833" },
    { name: "Medium", value: risk?.medium ?? 0, color: "#EE8866" },
    { name: "High",   value: risk?.high ?? 0,   color: "#EE6677" },
  ].filter(d => d.value > 0);

  // Bar chart data
  const barData = caps.map(c => ({
    name: (CAP_LABELS[c.capability] ?? c.capability).split(" ").slice(0, 2).join(" "),
    capability: c.capability,
    avg: c.avgScore ?? 0,
    assessed: c.assessedCount,
  }));

  return (
    <div className="p-6 space-y-8 max-w-7xl">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">CPO Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Organisation-wide AI capability overview
            {mismatchData?.aiAmbitionLabel && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-[#4477AA]/10 text-[#4477AA]">
                AI Ambition: {mismatchData.aiAmbitionLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={handleExport}>
            <Download className="w-3 h-3" />Export CSV
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Assessed"
          value={total}
          icon={Users}
          color="#4477AA"
          sub={`${data?.assessmentsLast30Days ?? 0} in last 30 days`}
        />
        <KpiCard
          label="Safe Readiness"
          value={`${safePercent}%`}
          icon={CheckCircle}
          color="#228833"
          sub={`${rd?.safe ?? 0} of ${total} participants`}
        />
        <KpiCard
          label="Compliance Rate"
          value={`${compliancePercent}%`}
          icon={ShieldCheck}
          color="#0D9488"
          sub={`${comp?.breach ?? 0} breach${(comp?.breach ?? 0) !== 1 ? "es" : ""}`}
        />
        <KpiCard
          label="Revalidation Due"
          value={reval?.dueSoon ?? 0}
          icon={Calendar}
          color={(reval?.overdue ?? 0) > 0 ? "#EE6677" : "#D97706"}
          sub={`${reval?.overdue ?? 0} overdue`}
        />
      </div>

      {/* ── Capability Intelligence ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon={BarChart3}
            title="Capability Intelligence"
            subtitle="Average scores across 6 AI capability domains"
            color="#4477AA"
          />
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              className={cn("px-3 py-1.5 transition-colors", activeCapTab === "heatmap" ? "bg-[#4477AA] text-white" : "text-muted-foreground hover:bg-muted/50")}
              onClick={() => setActiveCapTab("heatmap")}
            >Heatmap</button>
            <button
              className={cn("px-3 py-1.5 transition-colors", activeCapTab === "bar" ? "bg-[#4477AA] text-white" : "text-muted-foreground hover:bg-muted/50")}
              onClick={() => setActiveCapTab("bar")}
            >Bar Chart</button>
          </div>
        </div>

        {activeCapTab === "heatmap" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {caps.map(c => {
              const score = c.avgScore;
              const color = CAP_COLORS[c.capability] ?? "#4477AA";
              const heatClass = scoreToHeatClass(score);
              return (
                <Card key={c.capability} className="border-border overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-foreground">{CAP_LABELS[c.capability]}</span>
                    </div>
                    <div className={cn("rounded-lg p-3 text-center", heatClass)}>
                      <p className="text-3xl font-bold font-sora">
                        {score !== null ? score : "—"}
                      </p>
                      <p className="text-[10px] mt-0.5 opacity-80">avg score</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{c.assessedCount} assessed</span>
                      {score !== null && (
                        <span className="font-medium" style={{ color }}>
                          {score >= 70 ? "On track" : score >= 55 ? "Developing" : "Needs focus"}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={70} stroke="#228833" strokeDasharray="4 2" strokeWidth={1.5}
                    label={{ value: "Safe", fontSize: 9, fill: "#228833", position: "right" }} />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]} name="Avg Score">
                    {barData.map((entry) => (
                      <Cell key={entry.capability} fill={CAP_COLORS[entry.capability] ?? "#4477AA"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Trajectory + Mismatch row ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Readiness Trajectory */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-sora">
                <TrendingUp className="w-4 h-4 text-[#4477AA]" />
                Readiness Trajectory
              </CardTitle>
              {projectedMonths !== null && projectedMonths !== undefined && (
                <Badge variant="outline" className={cn(
                  "text-xs",
                  projectedMonths === 0
                    ? "border-[#228833] text-[#228833]"
                    : projectedMonths <= 3
                    ? "border-[#D97706] text-[#D97706]"
                    : "border-[#EE6677] text-[#EE6677]"
                )}>
                  {projectedMonths === 0 ? "Safe now" : `~${projectedMonths}mo to safe`}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {trajectoryPoints.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Activity className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Not enough data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Trajectory builds after 2+ months of assessments</p>
              </div>
            ) : (
              <>
                {currentAvg !== null && currentAvg !== undefined && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-bold font-sora text-foreground">{Math.round(currentAvg)}</span>
                    <span className="text-xs text-muted-foreground">current org average</span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={trajectoryPoints} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={70} stroke="#228833" strokeDasharray="4 2" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="avgScore" stroke="#4477AA" strokeWidth={2}
                      dot={{ r: 3, fill: "#4477AA" }} name="Org Avg" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Green dashed = safe threshold (70). Projection assumes current monthly rate of change.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Strategic Mismatch Feed */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-sora">
                <Target className="w-4 h-4 text-[#AA3377]" />
                Strategic Mismatch
              </CardTitle>
              {mismatchData && (
                <span className="text-xs text-muted-foreground">
                  Ambition: <strong className="text-foreground">{mismatchData.aiAmbitionLabel}</strong>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {mismatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <CheckCircle className="w-8 h-8 text-[#228833] mb-2" />
                <p className="text-sm text-muted-foreground">No strategic mismatches</p>
                <p className="text-xs text-muted-foreground mt-1">All domains meet the current AI ambition threshold</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mismatches.map(m => {
                  const color = SEVERITY_COLORS[m.severity];
                  return (
                    <div key={m.key} className="p-3 rounded-lg border" style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground">{m.label}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded capitalize" style={{ color, backgroundColor: `${color}15` }}>
                          {m.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span>Assessed: <strong className="text-foreground">{m.avgScore !== null ? m.avgScore : "N/A"}</strong></span>
                        <span>Required: <strong className="text-foreground">{m.requiredScore}</strong></span>
                        {m.gap !== null && m.gap > 0 && (
                          <span>Gap: <strong style={{ color }}>−{Math.round(m.gap)} pts</strong></span>
                        )}
                      </div>
                      {m.avgScore !== null && (
                        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.avgScore)}%`, backgroundColor: color }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                  <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Mismatches ≥15 pts indicate domains where the workforce is under-performing relative to the organisation's AI ambition level.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Regulatory Zone ── */}
      <div>
        <SectionHeader
          icon={Globe}
          title="Regulatory Zone"
          subtitle="Compliance distribution and risk profile across the workforce"
          color="#0D9488"
        />
        <div className="grid lg:grid-cols-3 gap-4">

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />Compliance Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compliancePie.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={compliancePie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                      {compliancePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#EE8866]" />Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskPie.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={riskPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                      {riskPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D97706]" />Revalidation Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {[
                { label: "Overdue",            value: reval?.overdue ?? 0,  color: "#EE6677" },
                { label: "Due within 14 days", value: reval?.dueSoon ?? 0,  color: "#EE8866" },
                { label: "Scheduled total",    value: reval?.total ?? 0,    color: "#4477AA" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold font-sora" style={{ color: item.value > 0 ? item.color : "hsl(var(--muted-foreground))" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Incidents + Config Audit Log ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <AlertTriangle className="w-4 h-4 text-[#EE6677]" />Recent Policy Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-[#228833] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No policy incidents</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.map(inc => (
                  <div key={inc.id} className="flex items-start justify-between p-2.5 rounded-lg bg-[#EE6677]/5 border border-[#EE6677]/15">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {inc.policyRuleId ?? "Policy Evaluation"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(inc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#EE6677]/10 text-[#EE6677] font-semibold ml-2 flex-shrink-0 capitalize">
                      {inc.result?.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <FileText className="w-4 h-4 text-[#4477AA]" />Configuration Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLog.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent configuration changes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.slice(0, 7).map(log => {
                  const isConfig = log.action?.startsWith("config.");
                  return (
                    <div key={log.id} className={cn(
                      "flex items-start justify-between p-2.5 rounded-lg border",
                      isConfig ? "border-[#D97706]/20 bg-[#D97706]/5" : "border-border/50"
                    )}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate capitalize">
                          {log.action?.replace(/\./g, " › ").replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.targetType}</p>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
