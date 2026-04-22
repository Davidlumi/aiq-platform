/**
 * Admin Dashboard — AiQ Enterprise Platform
 *
 * Canonical admin view from the build bible:
 * - Platform health KPIs (users, tenants, sessions, incidents)
 * - Content library stats (80 modules)
 * - Policy engine status
 * - Assessment coverage
 * - Recent audit activity
 * - Quick navigation to all admin areas
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Shield,
  TrendingUp,
  Settings,
  FileText,
  BookOpen,
  ClipboardList,
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string;
  value: number | string;
  icon: any;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}12` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {subtext && <p className="text-xs mt-1" style={{ color }}>{subtext}</p>}
    </div>
  );
}

// ─── Quick Link Card ──────────────────────────────────────────────────────────

function QuickLink({
  label,
  path,
  icon: Icon,
  desc,
  color,
}: {
  label: string;
  path: string;
  icon: any;
  desc: string;
  color: string;
}) {
  return (
    <Link href={path}>
      <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-[#10B981]/30 transition-all cursor-pointer group">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
          style={{ backgroundColor: `${color}12` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#10B981] transition-colors mt-0.5" />
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data, isLoading } = trpc.dashboard.admin.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">Platform Administration</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            System-wide overview · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Users className="w-3.5 h-3.5" />
              Manage Users
            </Button>
          </Link>
          <Link href="/reports">
            <Button size="sm" className="gap-2 text-xs bg-[#10B981] hover:bg-[#10B981]/90 text-white">
              <FileText className="w-3.5 h-3.5" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={data?.totalUsers ?? 0}
          icon={Users}
          color="#10B981"
        />
        <StatCard
          label="Tenants"
          value={data?.totalTenants ?? 0}
          icon={Building2}
          color="#AA3377"
        />
        <StatCard
          label="Active Sessions"
          value={data?.activeSessions ?? 0}
          icon={Activity}
          color="#228833"
          subtext={data?.activeSessions ? "In progress now" : "None active"}
        />
        <StatCard
          label="Policy Incidents"
          value={data?.policyIncidents ?? 0}
          icon={AlertTriangle}
          color={data?.policyIncidents ? "#EE6677" : "#228833"}
          subtext={data?.policyIncidents ? "Require review" : "All clear"}
        />
      </div>

      {/* Platform Health Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Assessment coverage */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-[#4477AA]" />
            <p className="text-sm font-semibold text-foreground">Assessment Engine</p>
          </div>
          <p className="text-2xl font-bold text-foreground">50</p>
          <p className="text-xs text-muted-foreground">real questions loaded</p>
          <div className="mt-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-[#228833]" />
            <span className="text-xs text-[#228833] font-medium">Signal scoring active</span>
          </div>
        </div>

        {/* Content library */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[#AA3377]" />
            <p className="text-sm font-semibold text-foreground">Content Library</p>
          </div>
          <p className="text-2xl font-bold text-foreground">80</p>
          <p className="text-xs text-muted-foreground">modules published</p>
          <div className="mt-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-[#228833]" />
            <span className="text-xs text-[#228833] font-medium">All 7 capabilities covered</span>
          </div>
        </div>

        {/* Policy engine */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#EE8866]" />
            <p className="text-sm font-semibold text-foreground">Policy Engine</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{data?.policyIncidents ?? 0}</p>
          <p className="text-xs text-muted-foreground">active incidents</p>
          <div className="mt-2 flex items-center gap-1.5">
            {data?.policyIncidents ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-[#EE6677]" />
                <span className="text-xs text-[#EE6677] font-medium">Review required</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-[#228833]" />
                <span className="text-xs text-[#228833] font-medium">No incidents</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Administration</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <QuickLink label="User Management"    path="/admin/users"    icon={Users}         desc="Manage users and roles"        color="#10B981" />
          <QuickLink label="Tenant Management"  path="/admin/tenants"  icon={Building2}     desc="Configure tenant settings"     color="#AA3377" />
          <QuickLink label="Policy Rules"       path="/policy"         icon={Shield}        desc="Manage policy engine rules"    color="#EE8866" />
          <QuickLink label="Audit Log"          path="/audit"          icon={FileText}      desc="View all system audit events"  color="#4477AA" />
          <QuickLink label="Reports"            path="/reports"        icon={TrendingUp}    desc="Generate and export reports"   color="#228833" />
          <QuickLink label="System Settings"    path="/profile"        icon={Settings}      desc="Account and system settings"   color="#66CCEE" />
        </div>
      </div>

      {/* Recent audit activity */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sora flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              Recent Platform Activity
            </CardTitle>
            <Link href="/audit">
              <button className="text-xs text-[#10B981] hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {data?.recentActivity?.length ? (
              data.recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.targetType} · {new Date(log.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
