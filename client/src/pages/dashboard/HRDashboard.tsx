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
  TrendingUp, RefreshCw, Layers, BookOpen, Globe, Zap, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";

const CAP_COLORS: Record<string, string> = {
  ai_interaction: "#4477AA", ai_output_evaluation: "#228833", ai_workflow_design: "#0D9488",
  workforce_ai_readiness: "#059669", ai_ethics_trust: "#AA3377", ai_change_leadership: "#D97706",
};

const CAP_LABELS: Record<string, string> = {
  ai_interaction: "AI Interaction", ai_output_evaluation: "Output Evaluation", ai_workflow_design: "Workflow Design",
  workforce_ai_readiness: "Workforce Readiness", ai_ethics_trust: "Ethics & Trust", ai_change_leadership: "Change Leadership",
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

      {/* Org Capability Heatmap */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-sora">
            <Layers className="w-4 h-4 text-[#AA3377]" />Capability Heatmap
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Average score per capability domain. Red = critical gap (&lt;40), amber = developing (40–74), green = strong (≥75).</p>
        </CardHeader>
        <CardContent>
          {caps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No assessment data yet</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {caps.map(c => {
                const score = c.avgScore ?? 0;
                const color = score >= 75 ? "#228833" : score >= 40 ? "#EE8866" : "#CC3311";
                const bg = score >= 75 ? "#22883312" : score >= 40 ? "#EE886612" : "#CC331112";
                const border = score >= 75 ? "#22883340" : score >= 40 ? "#EE886640" : "#CC331140";
                return (
                  <div key={c.capability} className="rounded-xl border p-4 text-center" style={{ borderColor: border, backgroundColor: bg }}>
                    <div className="text-3xl font-bold font-sora mb-1" style={{ color }}>{score}</div>
                    <div className="text-xs font-medium text-foreground leading-tight">{CAP_LABELS[c.capability] ?? c.capability}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{c.assessedCount} assessed</div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${color}20` }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Foundation Gap View + Risk Register */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <BookOpen className="w-4 h-4 text-[#D97706]" />Foundation Gap View
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Employees who have not yet established foundational AI capability (AI Interaction + Output Evaluation)</p>
          </CardHeader>
          <CardContent>
            {caps.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No data</div>
            ) : (() => {
              const foundationCaps = caps.filter(c => c.capability === "ai_interaction" || c.capability === "ai_output_evaluation");
              const foundationGapCount = foundationCaps.filter(c => (c.avgScore ?? 0) < 55).length;
              const totalAssessed = caps[0]?.assessedCount ?? 0;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold font-sora" style={{ color: foundationGapCount > 0 ? "#D97706" : "#228833" }}>
                        {foundationGapCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Foundation domains below threshold</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The two foundation domains (AI Interaction and Output Evaluation) must reach ≥55 before adaptive capability can be reliably assessed. 
                        Employees below this threshold are classified as Foundation Gap regardless of other scores.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {foundationCaps.map(c => {
                      const score = c.avgScore ?? 0;
                      const isGap = score < 55;
                      const color = isGap ? "#D97706" : "#228833";
                      return (
                        <div key={c.capability} className="flex items-center gap-3">
                          <div className="w-32 text-xs font-medium text-foreground">{CAP_LABELS[c.capability]}</div>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                          </div>
                          <div className="text-xs font-bold w-8 text-right" style={{ color }}>{score}</div>
                          {isGap && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D97706]/10 text-[#D97706] font-semibold">GAP</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 font-sora">
              <ShieldAlert className="w-4 h-4 text-[#EE6677]" />Risk Register
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Organisational AI risk indicators requiring governance attention</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                {
                  label: "High-risk employees",
                  value: data?.riskDistribution?.high ?? 0,
                  threshold: 0,
                  desc: "Employees with high risk band — require immediate manager review",
                  color: "#EE6677",
                },
                {
                  label: "Compliance breaches",
                  value: data?.complianceDistribution?.breach ?? 0,
                  threshold: 0,
                  desc: "Active policy compliance breaches in the last 30 days",
                  color: "#CC3311",
                },
                {
                  label: "Overdue revalidations",
                  value: data?.revalidationStats?.overdue ?? 0,
                  threshold: 0,
                  desc: "Employees whose assessment validity has expired",
                  color: "#D97706",
                },
                {
                  label: "At-risk employees",
                  value: data?.readinessDistribution?.at_risk ?? 0,
                  threshold: Math.round((data?.totalUsers ?? 0) * 0.3),
                  desc: "Employees classified at-risk (flag if &gt;30% of workforce)",
                  color: "#EE8866",
                },
                {
                  label: "Unassessed employees",
                  value: data?.readinessDistribution?.unknown ?? 0,
                  threshold: Math.round((data?.totalUsers ?? 0) * 0.2),
                  desc: "Employees with no assessment data (flag if &gt;20% of workforce)",
                  color: "#9CA3AF",
                },
              ].map(item => {
                const isFlag = item.value > item.threshold;
                const color = isFlag ? item.color : "#228833";
                return (
                  <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-lg border" style={{ borderColor: `${color}25`, backgroundColor: `${color}08` }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${color}20` }}>
                      {isFlag ? <AlertTriangle className="w-3 h-3" style={{ color }} /> : <CheckCircle className="w-3 h-3" style={{ color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{item.label}</span>
                        <span className="text-sm font-bold" style={{ color }}>{item.value}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Readiness Panel */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-sora">
            <Globe className="w-4 h-4 text-[#0D9488]" />Regulatory Readiness
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">UK AI regulatory context indicators — based on assessed capability profile</p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "EU AI Act Awareness",
                desc: "Ethics & Trust domain score indicates workforce awareness of AI regulatory obligations",
                score: caps.find(c => c.capability === "ai_ethics_trust")?.avgScore ?? null,
                threshold: 60,
                icon: ShieldCheck,
              },
              {
                label: "Algorithmic Accountability",
                desc: "Output Evaluation domain score indicates ability to audit and challenge AI outputs",
                score: caps.find(c => c.capability === "ai_output_evaluation")?.avgScore ?? null,
                threshold: 60,
                icon: Zap,
              },
              {
                label: "Change Governance",
                desc: "Change Leadership domain score indicates capacity to manage AI-driven organisational change",
                score: caps.find(c => c.capability === "ai_change_leadership")?.avgScore ?? null,
                threshold: 55,
                icon: TrendingUp,
              },
              {
                label: "Workforce Disclosure Readiness",
                desc: "Workforce AI Readiness score indicates capacity to disclose AI use to employees and regulators",
                score: caps.find(c => c.capability === "workforce_ai_readiness")?.avgScore ?? null,
                threshold: 55,
                icon: FileText,
              },
            ].map(item => {
              const Icon = item.icon;
              const score = item.score;
              const status = score === null ? "unknown" : score >= item.threshold ? "ready" : score >= item.threshold - 15 ? "partial" : "gap";
              const statusConfig = {
                ready:   { color: "#228833", bg: "#22883312", border: "#22883340", label: "Ready" },
                partial: { color: "#EE8866", bg: "#EE886612", border: "#EE886640", label: "Partial" },
                gap:     { color: "#EE6677", bg: "#EE667712", border: "#EE667740", label: "Gap" },
                unknown: { color: "#9CA3AF", bg: "#9CA3AF12", border: "#9CA3AF40", label: "No Data" },
              }[status];
              return (
                <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: statusConfig.border, backgroundColor: statusConfig.bg }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: statusConfig.color }} />
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: statusConfig.color, backgroundColor: `${statusConfig.color}15` }}>{statusConfig.label}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground mb-1">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  {score !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: statusConfig.color }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: statusConfig.color }}>{score}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-muted/30 border border-border">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Regulatory context note:</span> These indicators are derived from AiQ capability scores and are intended as internal readiness signals only. 
              They do not constitute legal compliance assessments. UK AI regulatory requirements include the ICO AI and Data Protection guidance, 
              the proposed AI Liability Directive, and sector-specific obligations (FCA, NHS, etc.). Consult your legal team for formal compliance assessment.
            </p>
          </div>
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
