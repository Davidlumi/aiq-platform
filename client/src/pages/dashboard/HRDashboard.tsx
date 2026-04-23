/**
 * HR Leader Dashboard — AiQ Platform
 *
 * Org-wide capability intelligence:
 * - Readiness distribution donut + KPIs
 * - Capability breakdown bar chart
 * - Compliance funnel (compliant / at-risk / breach)
 * - Risk distribution
 * - Revalidation stats
 * - Recent policy incidents feed
 * - Recent audit log
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Users, CheckCircle, AlertTriangle, XCircle, BarChart3,
  ShieldCheck, ShieldAlert, Calendar, FileText, Activity,
  TrendingUp, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";

const CAP_COLORS: Record<string, string> = {
  execution: "#4477AA", prioritisation: "#AA3377", validation: "#228833",
  judgement: "#EE6677", governance: "#EE8866", appropriateness: "#66CCEE",
  data_interpretation: "#BBBBBB",
};

const CAP_LABELS: Record<string, string> = {
  execution: "Execution", prioritisation: "Prioritisation", validation: "Validation",
  judgement: "Judgement", governance: "Governance", appropriateness: "Appropriateness",
  data_interpretation: "Data Interp.",
};

function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-bold text-foreground font-sora">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function HRDashboard() {
  const { data, isLoading } = trpc.dashboard.hr.useQuery();

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

  const readinessPie = [
    { name: "Safe",    value: rd?.safe ?? 0,    color: "#228833" },
    { name: "At Risk", value: rd?.at_risk ?? 0, color: "#EE8866" },
    { name: "Unsafe",  value: rd?.unsafe ?? 0,  color: "#EE6677" },
    { name: "Unknown", value: rd?.unknown ?? 0, color: "#9CA3AF" },
  ].filter(d => d.value > 0);

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

  const incidents = data?.recentIncidents ?? [];
  const auditLog = data?.recentAudit ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">HR Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm">Organisation-wide AI capability overview</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => window.location.reload()}>
          <RefreshCw className="w-3 h-3" />Refresh
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Employees"       value={data?.totalUsers ?? 0}                    icon={Users}        color="#4477AA" />
        <KpiCard label="Safe"                  value={rd?.safe ?? 0}                            icon={CheckCircle}  color="#228833" sub={`${data?.totalUsers ? Math.round(((rd?.safe ?? 0) / data.totalUsers) * 100) : 0}% of workforce`} />
        <KpiCard label="Assessments (30 days)" value={data?.assessmentsLast30Days ?? 0}         icon={Activity}     color="#AA3377" />
        <KpiCard label="Revalidation Overdue"  value={reval?.overdue ?? 0}                      icon={Calendar}     color="#EE6677" sub={`${reval?.dueSoon ?? 0} due within 14 days`} />
      </div>

      {/* Three distribution charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {[
          { title: "Readiness Distribution", data: readinessPie, icon: Users, color: "#4477AA" },
          { title: "Compliance State",        data: compliancePie, icon: ShieldCheck, color: "#228833" },
          { title: "Risk Distribution",       data: riskPie, icon: ShieldAlert, color: "#EE6677" },
        ].map(chart => (
          <Card key={chart.title} className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-sora">
                <chart.icon className="w-4 h-4" style={{ color: chart.color }} />
                {chart.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chart.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chart.data} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={2} dataKey="value">
                      {chart.data.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">No data</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Capability breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-sora">
            <BarChart3 className="w-4 h-4 text-[#4477AA]" />Capability Breakdown — Organisation Average
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caps.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={caps.map(c => ({ name: CAP_LABELS[c.capability] ?? c.capability, score: c.avgScore ?? 0, count: c.assessedCount }))}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string, props: any) => [`${v} (${props.payload.count} assessed)`, "Avg Score"]} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {caps.map((c, i) => (
                    <Cell key={i} fill={CAP_COLORS[c.capability] ?? "#4477AA"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No assessment data yet</div>
          )}
        </CardContent>
      </Card>

      {/* Incidents + Audit log */}
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
                      <p className="text-xs font-semibold text-foreground truncate">{inc.policyRuleId ?? "Policy Evaluation"}</p>
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
              <FileText className="w-4 h-4 text-[#4477AA]" />Recent Audit Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLog.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.slice(0, 6).map(log => (
                  <div key={log.id} className="flex items-start justify-between p-2.5 rounded-lg border border-border/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate capitalize">
                        {log.action?.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.targetType}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
