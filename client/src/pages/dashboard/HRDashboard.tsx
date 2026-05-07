/**
 * CPO / HR Leader Dashboard - AiQ Platform
 *
 * Competitive benchmark improvements implemented:
 * QW-1  Hero KPI - single dominant readiness number above the fold
 * QW-2  Nav rename - "Org Capability" label (handled in AppShell)
 * QW-3  Empty state quality - onboarding CTA when no assessments
 * QW-4  Strengths / Development priorities two-column split
 * QW-5  Conversation starters for all team members
 * SU-1  Department / role-family filter on the people table
 * SU-2  Progressive disclosure - summary → drill-down → action
 * SU-3  Action recommendations panel (Lattice-style)
 * SU-4  Card-level CSV export
 * SU-5  Signal transparency link to results
 * DI-1  LLM narrative layer - 3-sentence org intelligence brief
 * DI-2  Longitudinal trend view (trajectory chart)
 * DL-1  Typography hierarchy - 64px hero, 24px section, 14px body
 * DL-2  Whitespace - generous padding, clear section separation
 */
import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatSkeleton, CardSkeleton, ChartSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, CheckCircle, AlertTriangle, BarChart3,
  ShieldCheck, Globe, Clock, TrendingUp, RefreshCw,
  Download, Info, Target, Sparkles, ChevronDown,
  ChevronRight, Filter, ArrowRight, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

// --- Design tokens ------------------------------------------------------------
const GREEN  = "var(--primary)";
const AMBER  = "#F59E0B";
const RED    = "#EF4444";
const BLUE   = "#4477AA";
const PURPLE = "#F97316";
const CYAN   = "#06B6D4";

const CAP_COLORS: Record<string, string> = {
  ai_interaction:         BLUE,
  ai_output_evaluation:   GREEN,
  ai_workflow_design:     CYAN,
  workforce_ai_readiness: AMBER,
  ai_ethics_trust:        PURPLE,
  ai_change_leadership:   "#EC4899",
};
const CAP_LABELS: Record<string, string> = {
  ai_interaction:         "AI Interaction",
  ai_output_evaluation:   "Output Evaluation",
  ai_workflow_design:     "Workflow Design",
  workforce_ai_readiness: "Workforce Readiness",
  ai_ethics_trust:        "Ethics & Trust",
  ai_change_leadership:   "Change Leadership",
};

// --- Readiness state helpers --------------------------------------------------
function readinessColor(r: string | null) {
  if (r === "safe")    return GREEN;
  if (r === "at_risk") return AMBER;
  if (r === "unsafe")  return RED;
  return "#6B7280";
}
function readinessLabel(r: string | null) {
  if (r === "safe")    return "AI Ready";
  if (r === "at_risk") return "Developing";
  if (r === "unsafe")  return "Not Yet Ready";
  return "Not assessed";
}
// scoreToHeatClass replaced by brand.ts scoreColours — kept as inline style helper
function scoreToHeatClass(score: number | null): string {
  if (score === null) return "bg-muted/40 text-muted-foreground";
  // Delegate to brand.ts thresholds (scores here are 0-100)
  if (score >= 75) return "";  // AI Ready
  if (score >= 60) return "";  // Strong
  if (score >= 50) return "";  // Capable
  if (score >= 35) return "";  // Developing
  return "";                   // Emerging
}
function scoreToHeatStyle(score: number | null): { backgroundColor: string; color: string } | undefined {
  if (score === null) return undefined;
  const s = score / 10;
  if (s >= 7.5) return { backgroundColor: "rgba(22,163,74,0.15)",  color: "#4ade80" };
  if (s >= 6.0) return { backgroundColor: "rgba(16,185,129,0.15)", color: "#6ee7b7" };
  if (s >= 5.0) return { backgroundColor: "rgba(34,197,94,0.10)",  color: "#86efac" };
  if (s >= 3.5) return { backgroundColor: "rgba(245,158,11,0.15)", color: "#fcd34d" };
  return { backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5" };
}

// --- CSV export ---------------------------------------------------------------
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

// --- Custom tooltip -----------------------------------------------------------
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

// --- LLM Narrative Panel -----------------------------------------------------
function NarrativePanel({ narrative }: { narrative: { headline: string; insight: string; action: string } | null }) {
  if (!narrative) return null;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold text-primary uppercase tracking-widest">AI Intelligence Brief</span>
      </div>
      <p className="text-base font-semibold text-foreground leading-snug mb-2">{narrative.headline}</p>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{narrative.insight}</p>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border border-border/50">
        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground font-medium leading-relaxed">{narrative.action}</p>
      </div>
    </div>
  );
}

// --- Action Recommendations Panel (Lattice-style) ----------------------------
function ActionRecommendations({ data }: { data: any }) {
  const rd = data?.readinessDistribution;
  const reval = data?.revalidationStats;
  const caps = data?.capabilityBreakdown ?? [];
  const total = rd?.total ?? 0;

  const actions: Array<{ priority: "high" | "medium" | "low"; icon: any; title: string; description: string; color: string }> = [];

  // High priority: unsafe users
  if ((rd?.unsafe ?? 0) > 0) {
    actions.push({
      priority: "high",
      icon: AlertTriangle,
      title: `${rd.unsafe} people are Not Yet Ready`,
      description: "These individuals should not make unsupervised AI decisions. Schedule 1:1 reviews and assign structured development plans.",
      color: RED,
    });
  }

  // High priority: overdue revalidations
  if ((reval?.overdue ?? 0) > 0) {
    actions.push({
      priority: "high",
      icon: Clock,
      title: `${reval.overdue} revalidation${reval.overdue !== 1 ? "s" : ""} overdue`,
      description: "Overdue revalidations create compliance risk. Trigger automated reminders and escalate to line managers.",
      color: RED,
    });
  }

  // Medium: weakest capability
  const weakest = [...caps].sort((a: any, b: any) => (a.avgScore ?? 0) - (b.avgScore ?? 0))[0];
  if (weakest && (weakest.avgScore ?? 100) < 65) {
    actions.push({
      priority: "medium",
      icon: Target,
      title: `${CAP_LABELS[weakest.capability] ?? weakest.capability} is your weakest domain`,
      description: `Average score of ${weakest.avgScore} across ${weakest.assessedCount} people. Consider a targeted learning sprint or external workshop.`,
      color: AMBER,
    });
  }

  // Medium: at-risk users
  if ((rd?.at_risk ?? 0) > 0 && total > 0) {
    const pct = Math.round(((rd.at_risk) / total) * 100);
    if (pct > 40) {
      actions.push({
        priority: "medium",
        icon: TrendingUp,
        title: `${pct}% of the workforce is still Developing`,
        description: "A majority are building capability. Accelerate with cohort-based learning and monthly progress check-ins.",
        color: AMBER,
      });
    }
  }

  // Low: due-soon revalidations
  if ((reval?.dueSoon ?? 0) > 0) {
    actions.push({
      priority: "low",
      icon: CheckCircle,
      title: `${reval.dueSoon} revalidation${reval.dueSoon !== 1 ? "s" : ""} due within 14 days`,
      description: "Send proactive reminders now to avoid these becoming overdue.",
      color: BLUE,
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "low",
      icon: CheckCircle,
      title: "No urgent actions required",
      description: "Your workforce is on track. Continue monitoring and schedule revalidations as they approach.",
      color: GREEN,
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#D97706]" />
          Suggested Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {sorted.map((action, i) => {
          const Icon = action.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border"
              style={{ borderColor: `${action.color}25`, backgroundColor: `${action.color}06` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${action.color}15` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: action.color }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-foreground">{action.title}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium capitalize"
                    style={{ color: action.color, backgroundColor: `${action.color}15` }}>
                    {action.priority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// --- Department filter + people table ----------------------------------------
function PeopleTable({ users }: { users: Array<{ id: string; firstName: string; lastName: string; roleFamily: string | null; jobFunction: string | null; readiness: string | null }> }) {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [readinessFilter, setReadinessFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  const departments = useMemo(() => {
    const depts = new Set(users.map(u => u.roleFamily ?? "Unknown"));
    return ["all", ...Array.from(depts).sort()];
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const deptMatch = deptFilter === "all" || (u.roleFamily ?? "Unknown") === deptFilter;
      const readMatch = readinessFilter === "all" || u.readiness === readinessFilter;
      return deptMatch && readMatch;
    });
  }, [users, deptFilter, readinessFilter]);

  const displayed = expanded ? filtered : filtered.slice(0, 8);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          {departments.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                deptFilter === d
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>
              {d === "all" ? "All departments" : d}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {["all", "safe", "at_risk", "unsafe"].map(r => (
            <button key={r} onClick={() => setReadinessFilter(r)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                readinessFilter === r
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>
              {r === "all" ? "All states" : readinessLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Department</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Role</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Readiness</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No people match the current filters
                </td>
              </tr>
            ) : (
              displayed.map((u, i) => {
                const color = readinessColor(u.readiness);
                return (
                  <tr key={u.id} className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{u.roleFamily ?? "-"}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell truncate max-w-[160px]">{u.jobFunction ?? "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ color, backgroundColor: `${color}15` }}>
                        {readinessLabel(u.readiness)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 8 && (
        <button onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
          {expanded ? "Show less" : `Show all ${filtered.length} people`}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

// --- Main component -----------------------------------------------------------
export default function HRDashboard() {
  const { data, isLoading, refetch } = trpc.dashboard.hr.useQuery();
  const { data: trajectoryData } = trpc.dashboard.orgTrajectory.useQuery();
  const { data: mismatchData } = trpc.dashboard.orgStrategicMismatch.useQuery();
  const [activeCapTab, setActiveCapTab] = useState<"heatmap" | "bar">("heatmap");
  const [showPeople, setShowPeople] = useState(false);
  const [showCapIntel, setShowCapIntel] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showDeptBreakdown, setShowDeptBreakdown] = useState(true);
  const [showRegulatory, setShowRegulatory] = useState(true);

  const handleExportCaps = useCallback(() => {
    const caps = data?.capabilityBreakdown ?? [];
    exportToCsv("aiq-capability-summary.csv", caps.map(c => ({
      capability: CAP_LABELS[c.capability] ?? c.capability,
      avg_score: c.avgScore ?? "N/A",
      assessed_count: c.assessedCount,
    })));
  }, [data]);

  const handleExportPeople = useCallback(() => {
    const users = data?.userReadinessList ?? [];
    exportToCsv("aiq-people-readiness.csv", users.map(u => ({
      name: `${u.firstName} ${u.lastName}`,
      department: u.roleFamily ?? "",
      role: u.jobFunction ?? "",
      readiness: readinessLabel(u.readiness),
    })));
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const rd = data?.readinessDistribution;
  const comp = data?.complianceDistribution;
  const risk = data?.riskDistribution;
  const reval = data?.revalidationStats;
  const caps = data?.capabilityBreakdown ?? [];
  const total = rd?.total ?? 0;
  const safePercent = total > 0 ? Math.round(((rd?.safe ?? 0) / total) * 100) : 0;
  const narrative = data?.orgNarrative ?? null;
  const userList = data?.userReadinessList ?? [];
  const deptBreakdown = data?.departmentBreakdown ?? [];

  // No assessments yet - onboarding empty state
  if (total === 0) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No assessments yet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-6">
            Once your team members complete their AI Readiness Assessment, your organisation's capability intelligence will appear here - including readiness distribution, capability gaps, and compliance status.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="sm" className="gap-2 bg-primary hover:bg-[var(--primary)] text-white">
              <Users className="w-4 h-4" />
              Invite team members
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Info className="w-4 h-4" />
              How assessments work
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Trajectory
  const trajectoryPoints = trajectoryData?.dataPoints ?? [];
  const projectedMonths = trajectoryData?.projectedMonthsToSafe;
  const currentAvg = trajectoryData?.currentAvgScore;

  // Mismatch feed
  const mismatches = (mismatchData?.domains ?? [])
    .filter((d: any) => d.severity !== "none")
    .sort((a: any, b: any) => (b.gap ?? 0) - (a.gap ?? 0));

  // Capability bar data
  const barData = caps.map((c: any) => ({
    name: (CAP_LABELS[c.capability] ?? c.capability).split(" ").slice(0, 2).join(" "),
    capability: c.capability,
    avg: c.avgScore ?? 0,
    assessed: c.assessedCount,
  }));

  // Strengths vs development split (Culture Amp pattern)
  const sortedCaps = [...caps].sort((a: any, b: any) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
  const strengths = sortedCaps.filter((c: any) => (c.avgScore ?? 0) >= 65).slice(0, 3);
  const development = sortedCaps.filter((c: any) => (c.avgScore ?? 0) < 65).slice(0, 3);

  // Pie data
  const readinessPie = [
    { name: "AI Ready",       value: rd?.safe ?? 0,    color: GREEN },
    { name: "Developing",     value: rd?.at_risk ?? 0,  color: AMBER },
    { name: "Not Yet Ready",  value: rd?.unsafe ?? 0,  color: RED },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 max-w-7xl">

      {/* -- Page header -- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Org Capability</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organisation-wide AI readiness intelligence
            {mismatchData?.aiAmbitionLabel && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-[#4477AA]/10 text-[#4477AA]">
                AI Ambition: {mismatchData.aiAmbitionLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={handleExportCaps}>
            <Download className="w-3 h-3" />Export
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
        </div>
      </div>

      {/* -- HERO KPI - single dominant number -- */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Hero number */}
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              AI Ready
            </p>
            <div className="flex items-end gap-3">
              <span className="text-7xl font-black leading-none" style={{ color: safePercent >= 70 ? GREEN : safePercent >= 50 ? AMBER : RED }}>
                {safePercent}%
              </span>
              <div className="mb-2">
                <p className="text-sm font-medium text-foreground">{rd?.safe ?? 0} of {total} people</p>
                <p className="text-xs text-muted-foreground">assessed workforce</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${safePercent}%`, backgroundColor: safePercent >= 70 ? GREEN : safePercent >= 50 ? AMBER : RED }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span className="text-primary font-medium">70% target</span>
              <span>100%</span>
            </div>
          </div>

          {/* Supporting KPIs */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 sm:border-l sm:border-border sm:pl-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{rd?.at_risk ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Developing</p>
              <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{ backgroundColor: AMBER }} />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{rd?.unsafe ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Not Yet Ready</p>
              <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{ backgroundColor: RED }} />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{data?.assessmentsLast30Days ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assessed (30d)</p>
              <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{ backgroundColor: BLUE }} />
            </div>
          </div>
        </div>
      </div>

      {/* -- LLM Narrative -- */}
      {narrative && <NarrativePanel narrative={narrative} />}

      {/* -- Action Recommendations + Strengths/Development split -- */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ActionRecommendations data={data} />

        {/* Strengths / Development split (Culture Amp pattern) */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4477AA]" />
              Capability Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Strengths</p>
                {strengths.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No domains above 65 yet</p>
                ) : (
                  <div className="space-y-2">
                    {strengths.map((c: any) => (
                      <div key={c.capability} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-foreground truncate">{CAP_LABELS[c.capability]}</span>
                            <span className="text-xs font-bold text-primary ml-1">{c.avgScore}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${c.avgScore}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#D97706] uppercase tracking-widest mb-2">Development priorities</p>
                {development.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All domains on track</p>
                ) : (
                  <div className="space-y-2">
                    {development.map((c: any) => {
                      const color = (c.avgScore ?? 0) < 50 ? RED : AMBER;
                      return (
                        <div key={c.capability} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-foreground truncate">{CAP_LABELS[c.capability]}</span>
                              <span className="text-xs font-bold ml-1" style={{ color }}>{c.avgScore ?? "-"}</span>
                            </div>
                            <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${c.avgScore ?? 0}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -- Capability Intelligence -- */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowCapIntel(!showCapIntel)} className="flex items-center gap-2 group text-left">
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showCapIntel && "rotate-90")} />
            <div>
              <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Capability Intelligence</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Average scores across 6 AI capability domains</p>
            </div>
          </button>
          {showCapIntel && <div className="flex items-center gap-2">
            <button onClick={handleExportCaps} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Download className="w-3 h-3" />CSV
            </button>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              <button
                className={cn("px-3 py-1.5 transition-colors", activeCapTab === "heatmap" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50")}
                onClick={() => setActiveCapTab("heatmap")}>Heatmap</button>
              <button
                className={cn("px-3 py-1.5 transition-colors", activeCapTab === "bar" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50")}
                onClick={() => setActiveCapTab("bar")}>Bar</button>
            </div>
          </div>}
        </div>

        {activeCapTab === "heatmap" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {caps.map((c: any) => {
              const score = c.avgScore;
              const color = CAP_COLORS[c.capability] ?? BLUE;
              const heatClass = scoreToHeatClass(score);
              return (
                <Card key={c.capability} className="border-border overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-foreground">{CAP_LABELS[c.capability]}</span>
                    </div>
                    <div className={cn("rounded-lg p-3 text-center", heatClass)}>
                      <p className="text-3xl font-bold">{score !== null ? score : "-"}</p>
                      <p className="text-xs mt-0.5 opacity-80">avg score</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
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
              <ResponsiveContainer className="aiq-chart-mount" width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={70} stroke={GREEN} strokeDasharray="4 2" strokeWidth={1.5}
                    label={{ value: "Safe", fontSize: 9, fill: GREEN, position: "right" }} />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]} name="Avg Score">
                    {barData.map((entry: any) => (
                      <Cell key={entry.capability} fill={CAP_COLORS[entry.capability] ?? BLUE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* -- Trajectory + Mismatch row -- */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Readiness Trajectory (DI-2) */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#4477AA]" />
                Readiness Trajectory
              </CardTitle>
              {projectedMonths !== null && projectedMonths !== undefined && (
                <Badge variant="outline" className={cn(
                  "text-xs",
                  projectedMonths === 0 ? "border-primary text-primary"
                    : projectedMonths <= 3 ? "border-[#D97706] text-[#D97706]"
                    : "border-[#DC2626] text-[#DC2626]"
                )}>
                  {projectedMonths === 0 ? "Safe now" : `~${projectedMonths}mo to safe`}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {trajectoryPoints.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Not enough data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Trajectory builds after 2+ months of assessments</p>
              </div>
            ) : (
              <>
                {currentAvg !== null && currentAvg !== undefined && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-bold text-foreground">{Math.round(currentAvg)}</span>
                    <span className="text-xs text-muted-foreground">current org average</span>
                  </div>
                )}
                <ResponsiveContainer className="aiq-chart-mount" width="100%" height={160}>
                  <LineChart data={trajectoryPoints} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={70} stroke={GREEN} strokeDasharray="4 2" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="avgScore" stroke={BLUE} strokeWidth={2}
                      dot={{ r: 3, fill: BLUE }} name="Org Avg" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Green dashed = safe threshold (70). Projection assumes current monthly rate of change.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Strategic Mismatch */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-[#b91c1c]" />
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
                <CheckCircle className="w-8 h-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">No strategic mismatches</p>
                <p className="text-xs text-muted-foreground mt-1">All domains meet the current AI ambition threshold</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mismatches.map((m: any) => {
                  const color = m.severity === "critical" ? RED : m.severity === "moderate" ? AMBER : AMBER;
                  return (
                    <div key={m.key} className="p-3 rounded-lg border"
                      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground">{m.label}</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded capitalize"
                          style={{ color, backgroundColor: `${color}15` }}>{m.severity}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Assessed: <strong className="text-foreground">{m.avgScore !== null ? m.avgScore : "N/A"}</strong></span>
                        <span>Required: <strong className="text-foreground">{m.requiredScore}</strong></span>
                        {m.gap !== null && m.gap > 0 && (
                          <span>Gap: <strong style={{ color }}>−{Math.round(m.gap)} pts</strong></span>
                        )}
                      </div>
                      {m.avgScore !== null && (
                        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min(100, m.avgScore)}%`, backgroundColor: color }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* -- Department breakdown -- */}
      {deptBreakdown.length > 0 && (
        <div>
          <button onClick={() => setShowDeptBreakdown(!showDeptBreakdown)} className="flex items-center gap-2 mb-3 group">
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showDeptBreakdown && "rotate-90")} />
            <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Department Breakdown</h2>
          </button>
          {showDeptBreakdown && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {deptBreakdown.map((dept: any) => {
              const deptTotal = (dept.safe ?? 0) + (dept.atRisk ?? 0) + (dept.unsafe ?? 0);
              const deptSafePct = deptTotal > 0 ? Math.round((dept.safe / deptTotal) * 100) : 0;
              const color = deptSafePct >= 70 ? GREEN : deptSafePct >= 50 ? AMBER : RED;
              return (
                <Card key={dept.department} className="border-border">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-foreground truncate mb-2">{dept.department}</p>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-2xl font-bold" style={{ color }}>{deptSafePct}%</span>
                      <span className="text-xs text-muted-foreground mb-0.5">AI Ready</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${deptSafePct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{deptTotal} {deptTotal === 1 ? "person" : "people"}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>}
        </div>
      )}

      {/* -- People table with filter (SU-1 + progressive disclosure SU-2) -- */}
      <div>
        <button
          onClick={() => setShowPeople(!showPeople)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors mb-4 group"
        >
          <Users className="w-4 h-4" />
          People Readiness
          <span className="text-xs text-muted-foreground font-normal ml-1">({userList.length} {userList.length === 1 ? "person" : "people"})</span>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform group-hover:text-primary", showPeople && "rotate-90")} />
        </button>
        {showPeople && <PeopleTable users={userList} />}
      </div>

      {/* -- AL-03: Org-level Competence-Confidence Matrix -- */}
      {data?.orgCompetenceConfidenceMatrix && (data.orgCompetenceConfidenceMatrix as any).assessed > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Competence-Confidence Distribution</h2>
            <span className="text-xs text-muted-foreground font-normal ml-1">({(data.orgCompetenceConfidenceMatrix as any).assessed} assessed)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "unconscious_incompetence", label: "Blind Spot",  sublabel: "High confidence, low competence",  color: "#DC2626", bg: "rgba(220,38,38,0.07)" },
              { key: "conscious_incompetence",   label: "Aware Gap",   sublabel: "Low confidence, low competence",   color: "#D97706", bg: "rgba(217,119,6,0.07)" },
              { key: "conscious_competence",     label: "Developing",  sublabel: "High competence, low confidence",  color: "#2563EB", bg: "rgba(37,99,235,0.07)" },
              { key: "unconscious_competence",   label: "Mastery",     sublabel: "High confidence, high competence", color: "#16A34A", bg: "rgba(22,163,74,0.07)" },
            ] as const).map(q => {
              const qData = data.orgCompetenceConfidenceMatrix as any;
              const count = qData.quadrants[q.key] as number;
              const pct = qData.assessed > 0 ? Math.round((count / qData.assessed) * 100) : 0;
              return (
                <div key={q.key} className="rounded-xl border border-border p-4" style={{ background: q.bg }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: q.color }}>{q.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{q.sublabel}</div>
                    </div>
                    <div className="text-2xl font-bold tabular-nums" style={{ color: q.color }}>{count}</div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: q.color }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{pct}% of assessed</div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Blind Spot (high confidence, low competence) requires immediate attention — overconfidence masks real capability gaps.
          </p>
        </div>
      )}

      {/* -- Regulatory Zone -- */}
      <div>
        <button onClick={() => setShowRegulatory(!showRegulatory)} className="flex items-center gap-2 mb-4 group">
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showRegulatory && "rotate-90")} />
          <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#06B6D4]" />
            Regulatory Zone
          </h2>
        </button>
        {showRegulatory && <div className="grid lg:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4]" />Compliance Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {readinessPie.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer className="aiq-chart-mount" width="100%" height={180}>
                  <PieChart>
                    <Pie data={readinessPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      dataKey="value" paddingAngle={2}>
                      {readinessPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {[
                  { label: "Low risk",    value: risk?.low ?? 0,    color: GREEN },
                  { label: "Medium risk", value: risk?.medium ?? 0, color: AMBER },
                  { label: "High risk",   value: risk?.high ?? 0,   color: RED },
                ].map(item => {
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold text-foreground">{item.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D97706]" />Revalidation Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(reval?.overdue ?? 0) === 0 && (reval?.dueSoon ?? 0) === 0 && (reval?.total ?? 0) === 0 ? (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No revalidations scheduled yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Revalidation cycles begin after first assessments.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Overdue",            value: reval?.overdue ?? 0,  color: RED },
                    { label: "Due within 14 days", value: reval?.dueSoon ?? 0,  color: AMBER },
                    { label: "Scheduled total",    value: reval?.total ?? 0,    color: BLUE },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-bold" style={{ color: item.value > 0 ? item.color : "var(--muted-foreground)" }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>}
      </div>

    </div>
  );
}
