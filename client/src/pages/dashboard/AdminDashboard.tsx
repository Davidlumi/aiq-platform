/**
 * Admin Dashboard - AiQ Platform
 *
 * Platform health and system intelligence:
 * - User counts (total / active / pending / suspended)
 * - Session stats (total / completed / in-progress)
 * - Active scoring config details
 * - Policy incident count
 * - Recent system activity log
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatSkeleton, CardSkeleton, ChartSkeleton } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import {
  Users, Settings, Activity, ClipboardList, AlertTriangle,
  CheckCircle, Clock, Building2, RefreshCw, Sliders,
  ShieldCheck, UserCheck, UserX, Loader2,
} from "lucide-react";

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
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = trpc.dashboard.admin.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const cfg = data?.activeScoringConfig;
  const activity = data?.recentActivity ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Administration</h1>
          <p className="text-muted-foreground mt-1 text-sm">System health, user management, and scoring configuration</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => window.location.reload()}>
          <RefreshCw className="w-3 h-3" />Refresh
        </Button>
      </div>

      {/* User KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Users</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Users"     value={data?.totalUsers ?? 0}     icon={Users}     color="#4477AA" />
          <KpiCard label="Active"          value={data?.activeUsers ?? 0}    icon={UserCheck} color="#047857" sub={`${data?.totalUsers ? Math.round(((data.activeUsers ?? 0) / data.totalUsers) * 100) : 0}% of total`} />
          <KpiCard label="Pending"         value={data?.pendingUsers ?? 0}   icon={Clock}     color="#EE8866" />
          <KpiCard label="Suspended"       value={data?.suspendedUsers ?? 0} icon={UserX}     color="#DC2626" />
        </div>
      </div>

      {/* Session KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Assessment Sessions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Sessions"     value={data?.totalSessions ?? 0}     icon={ClipboardList} color="#4477AA" />
          <KpiCard label="Completed"          value={data?.completedSessions ?? 0} icon={CheckCircle}   color="#047857" sub={`${data?.totalSessions ? Math.round(((data.completedSessions ?? 0) / data.totalSessions) * 100) : 0}% completion rate`} />
          <KpiCard label="In Progress"        value={data?.inProgressSessions ?? 0} icon={Loader2}      color="#EE8866" />
          <KpiCard label="Policy Incidents"   value={data?.policyIncidents ?? 0}   icon={AlertTriangle} color="#DC2626" />
        </div>
      </div>

      {/* Scoring config + Activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#4477AA]" />Active Scoring Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cfg ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#047857]/5 border border-[#047857]/20">
                  <span className="text-xs font-semibold text-foreground">Version</span>
                  <span className="text-xs font-bold text-[#047857] font-mono">v{cfg.version}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground">Calibration Source</span>
                  <span className="text-xs font-semibold text-foreground capitalize">{cfg.calibrationSource?.replace(/_/g, " ") ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground">Contribution Cap</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{cfg.contributionCap ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground">Contribution Multiplier</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{cfg.contributionMultiplier ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground">Blocking Failure Min Items</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{cfg.blockingFailureMinItems ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground">Downgrade Failure Min Items</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{cfg.downgradeFailureMinItems ?? "-"}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active scoring configuration</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4477AA]" />Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {activity.map(log => (
                  <div key={log.id} className="flex items-start justify-between p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground capitalize truncate">
                        {log.action?.replace(/_/g, " ") ?? "-"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {log.targetType?.replace(/_/g, " ") ?? "-"}
                        {log.actorUserId && <span className="ml-1 font-mono opacity-60">· {log.actorUserId.slice(0, 6)}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform health summary */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#047857]" />Platform Health Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Scoring Engine",
                status: cfg ? "Active" : "No Config",
                ok: !!cfg,
              },
              {
                label: "Active Users",
                status: `${data?.activeUsers ?? 0} / ${data?.totalUsers ?? 0}`,
                ok: (data?.activeUsers ?? 0) > 0,
              },
              {
                label: "Session Completion",
                status: data?.totalSessions
                  ? `${Math.round(((data.completedSessions ?? 0) / data.totalSessions) * 100)}%`
                  : "No data",
                ok: data?.totalSessions ? ((data.completedSessions ?? 0) / data.totalSessions) > 0.5 : false,
              },
              {
                label: "Policy Incidents",
                status: (data?.policyIncidents ?? 0) === 0 ? "None" : `${data?.policyIncidents} active`,
                ok: (data?.policyIncidents ?? 0) === 0,
              },
            ].map(item => (
              <div key={item.label} className={cn(
                "p-3 rounded-xl border flex flex-col gap-1",
                item.ok ? "bg-[#047857]/5 border-[#047857]/20" : "bg-[#EE8866]/5 border-[#EE8866]/20"
              )}>
                <div className="flex items-center gap-1.5">
                  {item.ok
                    ? <CheckCircle className="w-3.5 h-3.5 text-[#047857]" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-[#EE8866]" />}
                  <span className="text-xs font-semibold text-foreground">{item.label}</span>
                </div>
                <span className={cn("text-sm font-bold", item.ok ? "text-[#047857]" : "text-[#EE8866]")}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
