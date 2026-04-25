/**
 * Reports Page — AiQ Enterprise Platform
 * Dual-audience reporting per AiQ Reporting & Analytics v2.3 spec
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FileText, Download, Plus, CheckCircle2, Clock,
  TrendingUp, TrendingDown, Minus, Users,
  BarChart3, User, Briefcase, Building2, AlertTriangle, Info,
  BarChart2, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REPORT_TYPE_LABELS: Record<string, string> = {
  learner_report: "Learner Report",
  manager_team_report: "Manager Team Report",
  org_readiness_report: "Org Readiness Report",
  audit_evidence_pack: "Audit Evidence Pack",
  dual_audience_narrative: "Dual-Audience Narrative",
  capability_requirement_fit: "Capability–Requirement Fit",
  trajectory_report: "Trajectory Report",
  small_function_report: "Small HR Function Report",
};

const READINESS_COLORS: Record<string, string> = {
  safe: "text-[#228833] bg-[#228833]/10 border-[#228833]/20",
  at_risk: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20",
  foundation_gap: "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20",
  not_assessed: "text-muted-foreground bg-muted border-border",
  insufficient_evidence: "text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/20",
};

const READINESS_LABELS: Record<string, string> = {
  safe: "AI-Ready",
  at_risk: "Developing",
  foundation_gap: "Foundation Gap",
  not_assessed: "Not Assessed",
  insufficient_evidence: "Insufficient Evidence",
};

function StatusBadge({ state }: { state: string }) {
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", READINESS_COLORS[state] ?? READINESS_COLORS.not_assessed)}>
      {READINESS_LABELS[state] ?? state}
    </span>
  );
}

function ScoreBar({ score, threshold, label }: { score: number; threshold: number; label: string }) {
  const pct = Math.min(100, score);
  const thresholdPct = Math.min(100, threshold);
  const status = score >= threshold ? "meets" : score >= threshold * 0.8 ? "approaching" : "gap";
  const barColor = status === "meets" ? "bg-[#228833]" : status === "approaching" ? "bg-[#F59E0B]" : "bg-[#EF4444]";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/ {threshold} req.</span>
          <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium",
            status === "meets" ? "text-[#228833] bg-[#228833]/10" :
            status === "approaching" ? "text-[#F59E0B] bg-[#F59E0B]/10" :
            "text-[#EF4444] bg-[#EF4444]/10"
          )}>
            {status === "meets" ? "Meets" : status === "approaching" ? "Approaching" : "Gap"}
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-foreground/30" style={{ left: `${thresholdPct}%` }} />
      </div>
    </div>
  );
}

function DualAudienceNarrativeView({ data }: { data: any }) {
  const [audience, setAudience] = useState<"individual" | "manager" | "board">("individual");
  const narratives = data?.narratives ?? {};
  const audienceConfig = [
    { key: "individual" as const, label: "Individual", icon: User, desc: "Personal, developmental" },
    { key: "manager" as const, label: "Manager", icon: Briefcase, desc: "Actionable, risk-aware" },
    { key: "board" as const, label: "Board / CPO", icon: Building2, desc: "Strategic, aggregated" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge state={data?.readinessState ?? "not_assessed"} />
        <span className="text-sm text-muted-foreground">Score: <strong className="text-foreground">{Math.round(data?.overallScore ?? 0)}</strong>/100</span>
        <span className="text-sm text-muted-foreground">Credibility: <strong className="text-foreground capitalize">{data?.credibilityBand}</strong></span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {audienceConfig.map(a => (
          <button key={a.key} onClick={() => setAudience(a.key)}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
              audience === a.key ? "border-[#10B981] bg-[#10B981]/5" : "border-border hover:border-[#10B981]/40"
            )}>
            <a.icon className={cn("w-3.5 h-3.5", audience === a.key ? "text-[#10B981]" : "text-muted-foreground")} />
            <div>
              <p className={cn("text-xs font-semibold", audience === a.key ? "text-[#10B981]" : "text-foreground")}>{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <Card className="border-border">
        <CardContent className="pt-4">
          <p className="text-sm text-foreground leading-relaxed">{narratives[audience] ?? "Narrative not available."}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CapabilityFitView({ data }: { data: any }) {
  const fitAnalysis = data?.fitAnalysis ?? [];
  const overallFit = data?.overallFit ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn("text-2xl font-bold",
          overallFit >= 0.8 ? "text-[#228833]" : overallFit >= 0.5 ? "text-[#F59E0B]" : "text-[#EF4444]"
        )}>
          {Math.round(overallFit * 100)}%
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Overall Capability Fit</p>
          <p className="text-xs text-muted-foreground">{fitAnalysis.filter((f: any) => f.status === "meets").length} of {fitAnalysis.length} domains meet threshold</p>
        </div>
      </div>
      <div className="space-y-3">
        {fitAnalysis.map((f: any) => <ScoreBar key={f.capability} score={f.score} threshold={f.threshold} label={f.label} />)}
      </div>
      {fitAnalysis.some((f: any) => f.status === "gap") && (
        <div className="flex items-start gap-2 text-xs text-[#F59E0B] bg-[#F59E0B]/8 rounded-lg px-3 py-2 border border-[#F59E0B]/20">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{fitAnalysis.filter((f: any) => f.status === "gap").length} domain(s) below minimum threshold. A targeted learning plan has been generated.</span>
        </div>
      )}
    </div>
  );
}

function TrajectoryView({ data }: { data: any }) {
  const trajectory = data?.trajectory ?? [];
  const trend = data?.trend ?? "insufficient_data";
  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const trendColor = trend === "improving" ? "text-[#228833]" : trend === "declining" ? "text-[#EF4444]" : "text-muted-foreground";
  const validPoints = trajectory.filter((t: any) => t.overallScore !== null);
  const maxScore = Math.max(...validPoints.map((t: any) => t.overallScore ?? 0), 100);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendIcon className={cn("w-5 h-5", trendColor)} />
        <div>
          <p className="text-sm font-semibold text-foreground capitalize">{trend.replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground">{data?.dataPoints ?? 0} assessment(s) completed</p>
        </div>
      </div>
      {validPoints.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-4 justify-center">
          <Info className="w-4 h-4" />No completed assessments yet.
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1 h-32 px-1">
            {validPoints.map((t: any, i: number) => {
              const height = Math.max(8, (t.overallScore / maxScore) * 100);
              return (
                <div key={t.sessionId} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-xs text-muted-foreground">{Math.round(t.overallScore)}</span>
                  <div className={cn("w-full rounded-t-sm", i === validPoints.length - 1 ? "bg-[#10B981]" : "bg-[#10B981]/40")} style={{ height: `${height}%` }} />
                </div>
              );
            })}
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Assessment</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">Score</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {validPoints.map((t: any, i: number) => (
                  <tr key={t.sessionId} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">Assessment #{i + 1}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{Math.round(t.overallScore)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SmallFunctionView({ data }: { data: any }) {
  const dist = data?.readinessDistribution ?? {};
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-xs text-[#F59E0B] bg-[#F59E0B]/8 rounded-lg px-3 py-2 border border-[#F59E0B]/20">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{data?.note}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Headcount", value: data?.totalHeadcount ?? 0, color: "text-foreground" },
          { label: "Assessed", value: data?.assessed ?? 0, color: "text-[#10B981]" },
          { label: "Assessment Rate", value: `${Math.round((data?.assessmentRate ?? 0) * 100)}%`, color: "text-[#10B981]" },
        ].map(m => (
          <Card key={m.label} className="border-border">
            <CardContent className="pt-4 text-center">
              <p className={cn("text-2xl font-bold", m.color)}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "AI-Ready", value: dist.ready ?? 0, color: "text-[#228833]" },
          { label: "Developing", value: dist.developing ?? 0, color: "text-[#F59E0B]" },
          { label: "Not Started", value: dist.notStarted ?? 0, color: "text-muted-foreground" },
        ].map(m => (
          <Card key={m.label} className="border-border">
            <CardContent className="pt-4 text-center">
              <p className={cn("text-2xl font-bold", m.color)}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {(data?.teamSummaries ?? []).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Name</th>
                <th className="text-center px-3 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {(data.teamSummaries as any[]).map((s: any) => (
                <tr key={s.userId} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{s.name || "—"}</td>
                  <td className="px-3 py-2 text-center"><StatusBadge state={s.readinessState} /></td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{s.overallScore !== null ? Math.round(s.overallScore) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportDataView({ job }: { job: any }) {
  const data = job.dataJson;
  if (!data) return (
    <div className="text-center py-12">
      <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground mb-1">Report data not yet available</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">This report requires assessment data to generate. Ensure team members have completed their assessments, then regenerate the report.</p>
    </div>
  );
  switch (job.reportType) {
    case "dual_audience_narrative": return <DualAudienceNarrativeView data={data} />;
    case "capability_requirement_fit": return <CapabilityFitView data={data} />;
    case "trajectory_report": return <TrajectoryView data={data} />;
    case "small_function_report": return <SmallFunctionView data={data} />;
    default: return (
      <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-96 text-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }
}

const REPORT_CATEGORIES = [
  {
    category: "Individual",
    icon: User,
    reports: [
      { value: "learner_report", label: "Learner Report", desc: "Capability and progress summary", icon: User },
      { value: "dual_audience_narrative", label: "Dual-Audience Narrative", desc: "Individual, manager, and board views", icon: FileText },
      { value: "capability_requirement_fit", label: "Capability–Requirement Fit", desc: "Score vs. minimum threshold per domain", icon: BarChart2 },
      { value: "trajectory_report", label: "Trajectory Report", desc: "Score progression over time", icon: TrendingUp },
    ],
  },
  {
    category: "Team & Organisation",
    icon: Users,
    reports: [
      { value: "manager_team_report", label: "Manager Team Report", desc: "Team readiness and risk overview", icon: Users },
      { value: "org_readiness_report", label: "Org Readiness Report", desc: "Organisation-wide capability distribution", icon: BarChart2 },
      { value: "small_function_report", label: "Small HR Function Report", desc: "Simplified team summary", icon: FileText },
    ],
  },
  {
    category: "Compliance & Audit",
    icon: FileText,
    reports: [
      { value: "audit_evidence_pack", label: "Audit Evidence Pack", desc: "Audit trail and policy compliance evidence", icon: Shield },
    ],
  },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<string>("dual_audience_narrative");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { data, isLoading, refetch } = trpc.report.list.useQuery({ page: 1, pageSize: 20 });

  const requestMutation = trpc.report.request.useMutation({
    onSuccess: (result: any) => {
      toast.success("Report generated successfully!");
      setActiveJobId(result.jobId ?? null);
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const jobs = (data?.jobs ?? []) as any[];
  const activeJob = activeJobId ? jobs.find(j => j.id === activeJobId) : jobs[0];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate capability, compliance, and audit reports with dual-audience narrative views.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Generator */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#10B981]" />Generate Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {REPORT_CATEGORIES.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <cat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat.category}</p>
                  </div>
                  <div className="space-y-1">
                    {cat.reports.map(r => (
                      <button key={r.value} onClick={() => setSelectedType(r.value)}
                        className={cn("w-full text-left rounded-lg border px-3 py-2.5 transition-all flex items-start gap-2.5",
                          selectedType === r.value ? "border-[#10B981] bg-[#10B981]/8 ring-1 ring-[#10B981]/20" : "border-border hover:border-[#10B981]/40 hover:bg-muted/30"
                        )}>
                        {r.icon && <r.icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", selectedType === r.value ? "text-[#10B981]" : "text-muted-foreground")} />}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-semibold", selectedType === r.value ? "text-[#10B981]" : "text-foreground")}>{r.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{r.desc}</p>
                        </div>
                        {selectedType === r.value && <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                onClick={() => requestMutation.mutate({ reportType: selectedType as any, parameters: {}, format: "json" })}
                disabled={requestMutation.isPending}
                className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
              >
                {requestMutation.isPending ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
                ) : (
                  <><BarChart3 className="w-3.5 h-3.5" />Generate Report</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Viewer */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <Card className="border-border"><CardContent className="pt-6 space-y-3"><Skeleton className="h-6 w-48" /><Skeleton className="h-32 w-full" /></CardContent></Card>
          ) : jobs.length === 0 ? (
            <Card className="border-border">
              <CardContent className="pt-12 pb-12 flex flex-col items-center gap-3 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">No reports yet</p>
                <p className="text-xs text-muted-foreground">Select a report type and click Generate.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {jobs.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {jobs.slice(0, 6).map((j: any) => (
                    <button key={j.id} onClick={() => setActiveJobId(j.id)}
                      className={cn("shrink-0 text-xs rounded-lg border px-3 py-2 transition-all",
                        (activeJobId === j.id || (!activeJobId && j === jobs[0]))
                          ? "border-[#10B981] bg-[#10B981]/5 text-[#10B981] font-medium"
                          : "border-border text-muted-foreground hover:border-[#10B981]/40"
                      )}>
                      {REPORT_TYPE_LABELS[j.reportType] ?? j.reportType}
                    </button>
                  ))}
                </div>
              )}
              {activeJob && (
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {REPORT_TYPE_LABELS[activeJob.reportType] ?? activeJob.reportType}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={activeJob.status === "completed" ? "default" : "secondary"} className="text-xs">
                          {activeJob.status === "completed"
                            ? <><CheckCircle2 className="w-3 h-3 mr-1" />Completed</>
                            : <><Clock className="w-3 h-3 mr-1" />{activeJob.status}</>}
                        </Badge>
                        <button
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(activeJob.dataJson, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${activeJob.reportType}_${new Date().toISOString().split("T")[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />Export
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generated {activeJob.requestedAt ? new Date(activeJob.requestedAt).toLocaleString() : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ReportDataView job={activeJob} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
